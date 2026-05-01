import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const { data: quiz, error } = await supabaseAdmin
    .from('quizzes')
    .select('theme_config, original_url')
    .eq('id', params.id)
    .single();

  if (error || !quiz || !quiz.original_url) {
    return new NextResponse('Quiz não encontrado ou sem URL original', { status: 404 });
  }

  // Grava a visualização de forma assíncrona (não usa await para não atrasar o carregamento)
  supabaseAdmin.from('quiz_views').insert([{ quiz_id: params.id }]).then(({error}) => {
     if (error) console.error('Erro ao registrar view:', error);
  });

  try {
    // 1. Fetch LIVE HTML from original_url
    const response = await fetch(quiz.original_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      },
      next: { revalidate: 60 } // Cache por 60 segundos para performance
    });

    if (!response.ok) {
       throw new Error(`Erro ao buscar o site original: ${response.status}`);
    }

    const rawHtml = await response.text();
    if (!rawHtml || rawHtml.length < 100) {
       throw new Error("O site original retornou um conteúdo vazio ou inválido.");
    }

    // 2. Parse and Inject
    const $ = cheerio.load(rawHtml);
    const baseUrlObj = new URL(quiz.original_url);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
    const replacements = quiz.theme_config?.replacements || {};

    const safeGuardV8 = `
      <script>
        window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements)};
        window.__IS_APPLYING__ = false;

        function applyReplacements(node) {
          if (window.__IS_APPLYING__) return;
          window.__IS_APPLYING__ = true;
          try {
            const walk = (n) => {
              if (n.nodeType === 3) {
                const val = n.nodeValue?.trim();
                if (val && window.QUIZ_REPLACEMENTS[val]) {
                  n.nodeValue = n.nodeValue.replace(val, window.QUIZ_REPLACEMENTS[val]);
                }
              } else if (n.nodeType === 1) {
                if (n.hasAttribute('href') && window.QUIZ_REPLACEMENTS[n.getAttribute('href')]) {
                  n.setAttribute('href', window.QUIZ_REPLACEMENTS[n.getAttribute('href')]);
                }
                if (n.tagName === 'IMG' && n.hasAttribute('src') && window.QUIZ_REPLACEMENTS[n.getAttribute('src')]) {
                  n.setAttribute('src', window.QUIZ_REPLACEMENTS[n.getAttribute('src')]);
                }
                n.childNodes.forEach(walk);
              }
            };
            walk(node || document.body);
          } finally {
            window.__IS_APPLYING__ = false;
          }
        }

        document.addEventListener('DOMContentLoaded', () => applyReplacements(document.body));
        const observer = new MutationObserver(() => {
          if (!window.__IS_APPLYING__) applyReplacements(document.body);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // Escutar mudanças do Editor em tempo real
        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'SYNC_REPLACEMENTS') {
             window.QUIZ_REPLACEMENTS = e.data.replacements;
             applyReplacements(document.body);
          }
        });
      </script>
    `;

    $('head').prepend(safeGuardV8);
    
    // Injetar o script da Utmify
    $('head').append('<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>');

    const themeConfig = quiz.theme_config || {};
    if (themeConfig.head_scripts) {
      $('head').append(`\n<!-- INJECTED HEAD SCRIPTS -->\n${themeConfig.head_scripts}\n`);
    }
    if (themeConfig.body_scripts) {
      $('body').append(`\n<!-- INJECTED BODY SCRIPTS -->\n${themeConfig.body_scripts}\n`);
    }
    
    // FIX DE ASSETS Absolutos
    $('[src^="/"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('//')) {
        $(el).attr('src', baseUrl + src);
      }
    });
    $('[href^="/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('//')) {
        $(el).attr('href', baseUrl + href);
      }
    });
    $('[srcset]').each((_, el) => {
      let srcset = $(el).attr('srcset');
      if (srcset) {
        srcset = srcset.split(',').map(s => {
          let parts = s.trim().split(' ');
          if (parts[0].startsWith('/')) parts[0] = baseUrl + parts[0];
          return parts.join(' ');
        }).join(', ');
        $(el).attr('srcset', srcset);
      }
    });

    $('script').each((_, el) => {
      const src = $(el).attr('src') || '';
      const content = $(el).html() || '';
      if (src.includes('anti-clone') || content.includes('debugger')) {
        $(el).remove();
      } else if (src && src.includes('.js')) {
         // Proxy JS files to replace location.hostname!
         const absoluteSrc = src.startsWith('/') ? baseUrl + src : src;
         $(el).attr('src', `/api/proxy?url=${encodeURIComponent(absoluteSrc)}&overrideHost=${encodeURIComponent(baseUrlObj.hostname)}`);
      }
    });

    const finalHtml = $.html();

    return new NextResponse(finalHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy': "frame-ancestors *;",
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      },
    });

  } catch (err: any) {
    console.error('Dynamic Proxy Error:', err);
    return new NextResponse(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Erro ao carregar o site original.</h2>
        <p>${err.message}</p>
      </div>
    `, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
