import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * SnapFunnel Engine v21.0 — LEGACY GOD MODE v7 (RESTORED)
 * A versão definitiva que elimina o piscar e garante o checkout.
 * Baseada no código original que o usuário confirmou como funcional.
 */
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
  const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';

  try {
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = baseUrlObj.origin;

    // 1. Fetch do site original
    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    let html = await response.text();
    const $ = cheerio.load(html);

    // 2. INJEÇÃO DO SCRIPT DE COMUNICAÇÃO GOD MODE v7
    const safeGuardV7 = `
      <script>
        window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements)};
        
        const prepareCheckoutUrl = (base) => {
          if (!base) return null;
          try {
            const url = new URL(base);
            const currentParams = new URLSearchParams(window.location.search);
            currentParams.forEach((v, k) => url.searchParams.set(k, v));
            return url.toString();
          } catch(e) { return base; }
        };

        const forceCheckout = (e, url) => {
          const finalUrl = prepareCheckoutUrl(url || window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__']);
          if (finalUrl) {
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            window.location.href = finalUrl;
          }
        };

        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"]');
          if (!target) return;

          const text = target.textContent?.toLowerCase() || '';
          const href = target.getAttribute('href') || '';
          
          const isCheckoutTrigger = 
            text.includes('comprar') || text.includes('checkout') || 
            text.includes('obter acesso') || text.includes('receber') ||
            href.includes('pay.') || href.includes('checkout') ||
            href.includes('hotmart') || href.includes('perfectpay') ||
            href.includes('cakto');

          if (isCheckoutTrigger) {
            forceCheckout(e);
          }
        }, true);
      </script>
    `;

    // 3. REESCRITA DE ASSETS (O pulo do gato do God Mode)
    $('head').prepend(`<base href="${baseUrl}/">`);
    $('head').append(safeGuardV7);
    $('head').append(`<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>`);

    // Injetar scripts customizados do usuário
    if (themeConfig.head_scripts) $('head').append(themeConfig.head_scripts);
    if (themeConfig.body_scripts) $('body').append(themeConfig.body_scripts);

    // Limpeza de travas anti-clone
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      const src = $(el).attr('src') || '';
      if (content.includes('location.hostname') || content.includes('anti-clone') || src.includes('anti-clone')) {
        $(el).remove();
      }
    });

    // Registrar visualização
    supabaseAdmin.from('quiz_views').insert([{ quiz_id: id }]).then(() => {});

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*'
      },
    });

  } catch (err: any) {
    // Fallback: Se o God Mode falhar no fetch, usa o Iframe como última instância
    return new NextResponse(`
      <iframe src="${originalUrl}" style="border:none;width:100%;height:100%;position:fixed;top:0;left:0;"></iframe>
    `, { headers: { 'Content-Type': 'text/html' } });
  }
}
