import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  if (!id) return new NextResponse('ID missing', { status: 400 });

  const { data: quiz } = await supabaseAdmin
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single();

  if (!quiz) return new NextResponse('Quiz não encontrado', { status: 404 });

  const originalUrl = quiz.original_url;
  const themeConfig = quiz.theme_config || {};
  const replacements = themeConfig.replacements || {};
  const userCheckoutUrl = replacements['__CHECKOUT_URL__'] || '';

  try {
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = baseUrlObj.origin;

    const response = await fetch(originalUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
    });

    let html = await response.text();
    const $ = cheerio.load(html);

    // 🧬 REESCRITA DE DNA (O Segredo da Visibilidade)
    const proxyPrefix = `/api/proxy?overrideHost=${encodeURIComponent(baseUrlObj.hostname)}&url=`;

    // 1. Forçar todos os Scripts e Styles a passarem pelo Proxy
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//')) {
        $(el).attr('src', proxyPrefix + encodeURIComponent(baseUrl + src));
      } else if (src && src.includes(baseUrlObj.hostname)) {
        $(el).attr('src', proxyPrefix + encodeURIComponent(src));
      }
    });

    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        $(el).attr('href', proxyPrefix + encodeURIComponent(baseUrl + href));
      }
    });

    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//')) {
        $(el).attr('src', proxyPrefix + encodeURIComponent(baseUrl + src));
      }
    });

    // 2. Sandbox de Interceptação (God Mode)
    const sandbox = `
      <script>
        (function() {
          const proxyUrl = "${proxyPrefix}";
          const targetBase = "${baseUrl}";

          // Interceptar Fetch para carregar os dados do Quiz original
          const _f = window.fetch;
          window.fetch = function(r, c) {
            if (typeof r === 'string' && (r.startsWith('/') || r.includes(targetBase))) {
              r = proxyUrl + encodeURIComponent(r.startsWith('/') ? targetBase + r : r);
            }
            return _f.call(this, r, c);
          };

          // Forçar visibilidade (Alguns sites escondem o body se detectam proxy)
          document.documentElement.style.display = 'block';
          document.body.style.display = 'block';
          
          // Checkout
          const CHECKOUT = "${userCheckoutUrl}";
          document.addEventListener('click', (e) => {
            const t = e.target.closest('a, button, [role="button"]');
            if (!t) return;
            const h = t.getAttribute('href') || '';
            if ((h.includes('checkout') || h.includes('pay.') || h.includes('hotmart')) && CHECKOUT) {
              e.preventDefault();
              window.location.href = CHECKOUT + window.location.search;
            }
          }, true);
        })();
      </script>
    `;

    $('head').prepend(`<base href="${baseUrl}/">`);
    $('head').prepend(sandbox);
    $('head').append(`<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>`);

    if (themeConfig.head_scripts) $('head').append(themeConfig.head_scripts);
    if (themeConfig.body_scripts) $('body').append(themeConfig.body_scripts);

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
    });

  } catch (err: any) {
    return new NextResponse(`<iframe src="${originalUrl}" style="border:none;width:100%;height:100%;"></iframe>`, { headers: { 'Content-Type': 'text/html' } });
  }
}
