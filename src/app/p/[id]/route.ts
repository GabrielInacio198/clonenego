import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode v7.0 — Ultra-Compatible (SPA & Lovable Ready)
 * 
 * Estratégia:
 * 1. Proxy total de Scripts e Styles (internos e externos) para bypass de CORS.
 * 2. Spoofing profundo de window.location (origin, host, hostname, pathname).
 * 3. Interceptação de injeção dinâmica de scripts (Vite/Webpack compatible).
 * 4. Preservação de integridade visual com <base> tag.
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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
    // 0. TRACKING (Assíncrono)
    // ═══════════════════════════════════════════════
    supabaseAdmin.from('cloned_page_views').insert([{ page_id: id }]).then(({error}) => {
      if (error) console.error('Erro ao registrar view da página:', error);
    });

    // ═══════════════════════════════════════════════
    // 1. BASE TAG (Estabilidade Visual)
    // ═══════════════════════════════════════════════
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // ═══════════════════════════════════════════════
    // 2. ENGINE SNAPFUNNEL v7.2 (Ultra-Aggressive Proxy)
    // ═══════════════════════════════════════════════
    const engineScript = `
      <script id="snapfunnel-engine-v7">
        (function() {
          console.log("SnapFunnel Engine v7.2 - God Mode Active");
          const CHECKOUT_URL = '${checkoutUrl}';
          const TARGET_HOST = '${targetHost}';
          const TARGET_ORIGIN = '${baseUrl}';
          const TARGET_PATH = '${targetPath}';
          const PROXY_URL = '${currentOrigin}/api/proxy?url=';

          // 1. MATADOR DE SERVICE WORKERS
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
              for (let registration of registrations) { registration.unregister(); }
            });
          }

          // 2. DEEP SPOOFING
          try {
            const spoof = (obj, prop, value) => {
              try { Object.defineProperty(obj, prop, { get: () => value, configurable: true }); } catch(e) {}
            };
            spoof(window.location, 'hostname', TARGET_HOST);
            spoof(window.location, 'host', TARGET_HOST);
            spoof(window.location, 'origin', TARGET_ORIGIN);
            spoof(window.location, 'pathname', TARGET_PATH);
          } catch(e) {}

          // 3. INTERCEPTOR DE CHECKOUT (God Mode Style)
          const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
          const checkoutKeywords = ['comprar', 'receber agora', 'obter acesso', 'quero o plano', 'garantir', 'receber meu', 'checkout'];

          function prepareCheckoutUrl(url) {
            if (!url) return null;
            try {
              const u = new URL(url);
              const p = new URLSearchParams(window.location.search);
              ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck'].forEach(k => { 
                if (p.get(k)) u.searchParams.set(k, p.get(k)); 
              });
              return u.toString();
            } catch(e) { return url; }
          }

          function patch(el) {
            if (!el || el.nodeType !== 1) return;

            if (el.tagName === 'A') {
              const href = (el.getAttribute('href') || '').toLowerCase();
              if (href.startsWith('#')) {
                el.onclick = (e) => {
                  e.preventDefault(); e.stopPropagation();
                  try {
                    const target = document.querySelector(el.getAttribute('href'));
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                  } catch(err) {}
                };
                return;
              }

              if (CHECKOUT_URL && (gateways.some(g => href.includes(g)) || el.dataset.checkout)) {
                el.href = prepareCheckoutUrl(CHECKOUT_URL);
                el.onclick = (e) => {
                  e.preventDefault(); e.stopPropagation();
                  window.location.href = el.href;
                };
              }
            }
            
            if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
              const text = (el.textContent || '').toLowerCase();
              if (CHECKOUT_URL && checkoutKeywords.some(k => text.includes(k))) {
                el.onclick = (e) => {
                  e.preventDefault(); e.stopPropagation();
                  window.location.href = prepareCheckoutUrl(CHECKOUT_URL);
                };
              }
            }
          }

          // MutationObserver Robusto (SPA & Lovable)
          const obs = new MutationObserver(mutations => {
            mutations.forEach(m => {
              if (m.type === 'childList') {
                m.addedNodes.forEach(n => {
                  if (n.nodeType === 1) {
                    patch(n);
                    n.querySelectorAll('a, button, [role="button"]').forEach(patch);
                    if (n.tagName === 'SCRIPT' && n.src && !n.src.includes('/api/proxy')) {
                      n.src = PROXY_URL + encodeURIComponent(n.src) + '&overrideHost=' + TARGET_HOST;
                    }
                  }
                });
              } else if (m.type === 'attributes' && (m.attributeName === 'href' || m.attributeName === 'src')) {
                patch(m.target);
              }
            });
          });

          obs.observe(document.documentElement, { 
            childList: true, 
            subtree: true, 
            attributes: true, 
            attributeFilter: ['href', 'src'] 
          });
          
          window.addEventListener('DOMContentLoaded', () => {
             document.querySelectorAll('a, button, [role="button"]').forEach(patch);
          });

          // 4. PROXY DE NETWORK (Fetch/XHR)
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

    // ═══════════════════════════════════════════════
    // 3. INJEÇÃO DE TRACKING NATIVO (Utmify)
    // ═══════════════════════════════════════════════
    $('head').append(`
<!-- UTMIFY UTMs TRACKING -->
<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
    `);

    // ═══════════════════════════════════════════════
    // 4. REESCRITA DE ASSETS (Proxy Agressivo)
    // ═══════════════════════════════════════════════
    const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
    
    $('[src], [href]').each((_, el) => {
      const tag = $(el).prop('tagName');
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr) || '';
      
      if (!val || val.startsWith('data:') || val.startsWith('javascript:')) return;

      // 1. Âncoras
      if (val.startsWith('#')) {
        $(el).attr(attr, `javascript:document.querySelector('${val}')?.scrollIntoView({behavior:'smooth'})`);
        return;
      }

      // 2. Checkout
      if (tag === 'A' && checkoutUrl && gateways.some(g => val.toLowerCase().includes(g))) {
        $(el).attr(attr, checkoutUrl);
        return;
      }

      // 3. PROXY TOTAL (Scripts e Estilos)
      const isScriptOrStyle = tag === 'SCRIPT' || (tag === 'LINK' && $(el).attr('rel') === 'stylesheet');

      if (isScriptOrStyle) {
        const absoluteVal = val.startsWith('/') ? baseUrl + val : (val.startsWith('http') ? val : baseUrl + '/' + val);
        const proxied = `${currentOrigin}/api/proxy?url=${encodeURIComponent(absoluteVal)}&overrideHost=${targetHost}`;
        $(el).attr(attr, proxied);
        $(el).removeAttr('integrity');
        $(el).removeAttr('crossorigin');
      }
    });

    // Injetar Pixels e Scripts Customizados
    if (config.pixel_script) $('body').append(`<div id="sf-pixel" style="display:none !important">${config.pixel_script}</div>`);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    return new NextResponse($.html(), {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error: any) {
    return new NextResponse(`Erro: ${error.message}`, { status: 500 });
  }
}
