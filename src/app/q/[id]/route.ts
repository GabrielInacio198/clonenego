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

  try {
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = baseUrlObj.origin;

    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    let html = await response.text();
    const $ = cheerio.load(html);

    // 🛡️ PROTEÇÃO TOTAL GOD MODE v7.1 (Histórico e Localização)
    const protectionV71 = `
      <script>
        // 1. Impedir erros de History API (Causa da tela branca no console)
        const blockHistory = (target) => {
          const original = target.history.replaceState;
          target.history.replaceState = function(state, title, url) {
            if (url && url.toString().includes('http') && !url.toString().includes(window.location.hostname)) {
              console.log("SnapFunnel: Bloqueando tentativa de mudança de origem para " + url);
              return; // Bloqueia a mudança para outro domínio
            }
            return original.apply(this, arguments);
          };
          const originalPush = target.history.pushState;
          target.history.pushState = function(state, title, url) {
            if (url && url.toString().includes('http') && !url.toString().includes(window.location.hostname)) {
              return;
            }
            return originalPush.apply(this, arguments);
          };
        };
        blockHistory(window);

        // 2. Enganar a Localização
        try {
          Object.defineProperty(window.location, 'hostname', { get: () => "${baseUrlObj.hostname}" });
          Object.defineProperty(window.location, 'host', { get: () => "${baseUrlObj.host}" });
          Object.defineProperty(window.location, 'origin', { get: () => "${baseUrlObj.origin}" });
        } catch(e) {}

        // 3. Interceptor de Checkout
        window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements)};
        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"]');
          if (!target) return;
          const href = target.getAttribute('href') || '';
          const text = target.textContent?.toLowerCase() || '';
          const checkoutUrl = window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'];
          
          if ((href.includes('hotmart') || href.includes('checkout') || text.includes('comprar')) && checkoutUrl) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = checkoutUrl + window.location.search;
          }
        }, true);
      </script>
    `;

    $('head').prepend(`<base href="${baseUrl}/">`);
    $('head').prepend(protectionV71);
    $('head').append(`<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>`);

    if (themeConfig.head_scripts) $('head').append(themeConfig.head_scripts);
    if (themeConfig.body_scripts) $('body').append(themeConfig.body_scripts);

    // Limpeza de travas
    $('script').each((_, el) => {
      if ($(el).html().includes('location.hostname')) $(el).remove();
    });

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL'
      },
    });

  } catch (err: any) {
    return new NextResponse(`<iframe src="${originalUrl}" style="border:none;width:100%;height:100%;"></iframe>`, { headers: { 'Content-Type': 'text/html' } });
  }
}
