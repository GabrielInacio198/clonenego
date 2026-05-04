import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. Obter User ID do Valentor (Dono do Projeto)
    const validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro alvo: ${response.status}`);
    }

    const htmlBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    let rawHtml = decoder.decode(htmlBuffer);

    const $ = cheerio.load(rawHtml);
    const pageTitle = $('title').text() || 'Quiz Clonado';
    
    const baseUrlObj = new URL(url);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;

    // PROTEÇÃO NUCLEAR V7 (God Mode): Proxy CORS + Dicionário de Mutação Imortal
    const safeGuardV7 = `
      <script id="god-mode-v7">
        console.log("God Mode v7 Ativado - Proxy + Mutation Dictionary");
        
        // HACK 1: Enganar roteamento do Next.js original
        try { window.history.replaceState(null, '', '/'); } catch(e) {}

        const proxyUrl = '/api/proxy?url=';
        const targetBaseUrl = '${baseUrl}';

        // HACK 2: Redirecionar Fetch e XHR para o Proxy CORS
        const _origFetch = window.fetch;
        window.fetch = async function() {
          let [resource, config] = arguments;
          if (typeof resource === 'string') {
            if (resource.startsWith('/')) {
              resource = proxyUrl + encodeURIComponent(targetBaseUrl + resource);
            } else if (resource.startsWith(targetBaseUrl)) {
              resource = proxyUrl + encodeURIComponent(resource);
            }
          } else if (resource instanceof Request) {
             const urlObj = new URL(resource.url, window.location.origin);
             if(urlObj.origin === window.location.origin && urlObj.pathname.startsWith('/')) {
                resource = new Request(proxyUrl + encodeURIComponent(targetBaseUrl + urlObj.pathname + urlObj.search), resource);
             } else if (urlObj.origin === targetBaseUrl) {
                resource = new Request(proxyUrl + encodeURIComponent(resource.url), resource);
             }
          }
          return _origFetch.call(this, resource, config);
        };

        const _origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
          if (typeof url === 'string') {
            if (url.startsWith('/')) {
              url = proxyUrl + encodeURIComponent(targetBaseUrl + url);
            } else if (url.startsWith(targetBaseUrl)) {
              url = proxyUrl + encodeURIComponent(url);
            }
          }
          return _origOpen.call(this, method, url, async, user, password);
        };

        // HACK 3: Dicionário de Mutação (Troca os textos na hora que o React tenta renderizar)
        window.QUIZ_REPLACEMENTS = window.QUIZ_REPLACEMENTS || {};

        function applyReplacements(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            if (text && text.trim() && window.QUIZ_REPLACEMENTS[text.trim()]) {
              node.nodeValue = text.replace(text.trim(), window.QUIZ_REPLACEMENTS[text.trim()]);
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'IMG' && node.src) {
               const origSrc = node.getAttribute('src');
               for (const [key, value] of Object.entries(window.QUIZ_REPLACEMENTS)) {
                  if (origSrc === key || node.src.includes(encodeURIComponent(key))) {
                     node.src = value;
                     node.srcset = '';
                     break;
                  }
               }
            }
            node.childNodes.forEach(applyReplacements);
          }
        }

        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => applyReplacements(node));
            } else if (mutation.type === 'characterData') {
              const oldVal = mutation.target.nodeValue;
              if (oldVal && oldVal.trim() && window.QUIZ_REPLACEMENTS[oldVal.trim()]) {
                 mutation.target.nodeValue = oldVal.replace(oldVal.trim(), window.QUIZ_REPLACEMENTS[oldVal.trim()]);
              }
            }
          });
        });

        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true
        });

        document.addEventListener('DOMContentLoaded', () => {
          applyReplacements(document.body);
        });

        // Escuta atualizações do Editor Visual do Painel
        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'SYNC_REPLACEMENTS') {
             window.QUIZ_REPLACEMENTS = e.data.replacements;
             applyReplacements(document.body);
          }
        });
      </script>
    `;
    $('head').prepend(safeGuardV7);

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
      }
    });

    const finalHtml = $.html();

    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: { rawHtml: finalHtml },
      })
      .select()
      .single();

    if (quizError) throw quizError;

    return NextResponse.json({ 
      success: true, 
      quiz: quizData,
      message: 'Clone Estrutural concluído com sucesso!'
    });

  } catch (error: any) {
    console.error('Ripper Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao ripar o site' }, { status: 500 });
  }
}
