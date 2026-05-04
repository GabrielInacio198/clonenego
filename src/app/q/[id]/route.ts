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
    return new NextResponse('Quiz não encontrado', { status: 404 });
  }

  try {
    const themeConfig = quiz.theme_config || {};
    let html = themeConfig.rawHtml;

    if (!html) {
      const response = await fetch(quiz.original_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        html = new TextDecoder('utf-8').decode(buffer);
      }
    }

    if (!html) throw new Error("Conteúdo vazio");

    const $ = cheerio.load(html);
    const baseUrlObj = new URL(quiz.original_url);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
    const replacements = themeConfig.replacements || {};

    // 🛡️ GOD MODE v7.5 - ATOMIC & IDEMPOTENT
    const hasSafeGuard = html.includes('id="god-mode-v7"');
    
    if (!hasSafeGuard) {
      const safeGuard = `
        <script>window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements).replace(/</g, '\\u003c')};</script>
        <script id="god-mode-v7">
          (function() {
            if (window.__GOD_MODE_V7__) return;
            window.__GOD_MODE_V7__ = true;

            var proxyUrl = '/api/proxy?url=';
            var targetBaseUrl = '${baseUrl}';
            var originalParams = new URLSearchParams(window.location.search);

            try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch(e) {}

            var _fetch = window.fetch;
            window.fetch = function(res, config) {
              if (typeof res === 'string' && (res.startsWith('/') || res.startsWith(targetBaseUrl))) {
                res = proxyUrl + encodeURIComponent(res.startsWith('/') ? targetBaseUrl + res : res);
              }
              return _fetch.apply(this, arguments);
            };

            function applyR(node) {
              if (!node || node.nodeType !== 1) return;
              node.querySelectorAll('a, img').forEach(el => {
                var src = el.getAttribute('src');
                var href = el.getAttribute('href');
                if (src && window.QUIZ_REPLACEMENTS[src]) el.src = window.QUIZ_REPLACEMENTS[src];
                if (href && window.QUIZ_REPLACEMENTS[href]) el.href = window.QUIZ_REPLACEMENTS[href];
              });
            }

            new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(applyR))).observe(document.documentElement, { childList: true, subtree: true });
            
            document.addEventListener('click', function(e) {
              var el = e.target.closest('a, button');
              if (!el) return;
              var text = el.textContent.toLowerCase();
              var checkout = window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'];
              if (checkout && (text.includes('comprar') || text.includes('receber') || text.includes('checkout'))) {
                e.preventDefault();
                window.location.href = checkout + window.location.search;
              }
            }, true);
          })();
        </script>
      `;
      $('head').prepend(safeGuard);
    }

    // Fix Assets
    $('[src^="/"], [href^="/"]').each((_, el) => {
      const attr = $(el).attr('src') ? 'src' : 'href';
      const val = $(el).attr(attr);
      if (val && !val.startsWith('//')) $(el).attr(attr, baseUrl + val);
    });

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *;"
      }
    });

  } catch (err: any) {
    return new NextResponse(`Erro: ${err.message}`, { status: 500 });
  }
}
