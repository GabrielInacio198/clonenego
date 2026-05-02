import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode — O motor definitivo para clonagem de páginas
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

    // 2. Fetch LIVE
    const response = await fetch(originalUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return new NextResponse(`<h1>Erro ao acessar (${response.status})</h1>`, { status: 502 });
    }

    const rawHtml = new TextDecoder('utf-8').decode(await response.arrayBuffer());
    const $ = cheerio.load(rawHtml);
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
    const targetHost = baseUrlObj.host;

    // ═══════════════════════════════════════════════
    // ENGINE — Injetar scripts de proxy e interceptação
    // ═══════════════════════════════════════════════

    const engineScript = `
      <script id="snapfunnel-engine">
        (function() {
          console.log("SnapFunnel Engine v2.0 - God Mode");
          
          const TARGET_HOST = '${targetHost}';
          const TARGET_ORIGIN = '${baseUrl}';
          const CHECKOUT_URL = '${checkoutUrl}';
          const PROXY_BASE = window.location.origin + '/api/proxy?url=';

          // 1. SPOOFING AGRESSIVO
          Object.defineProperty(window.location, 'hostname', { get: () => TARGET_HOST, configurable: true });
          Object.defineProperty(window.location, 'host', { get: () => TARGET_HOST, configurable: true });
          Object.defineProperty(window.location, 'origin', { get: () => TARGET_ORIGIN, configurable: true });
          try { document.domain = TARGET_HOST; } catch(e) {}

          // 2. PROXY DE FETCH/XHR
          const _fetch = window.fetch;
          window.fetch = async function(res, cfg) {
            if (typeof res === 'string' && (res.startsWith('/') || res.includes(TARGET_HOST))) {
              const url = res.startsWith('/') ? TARGET_ORIGIN + res : res;
              res = PROXY_BASE + encodeURIComponent(url) + '&overrideHost=' + TARGET_HOST;
            }
            return _fetch.call(this, res, cfg);
          };

          // 3. INTERCEPTADOR DE CHECKOUT (MutationObserver para botões flutuantes)
          const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
          
          function patchLink(el) {
            if (!CHECKOUT_URL) return;
            const href = (el.getAttribute('href') || '').toLowerCase();
            const isCheckout = gateways.some(g => href.includes(g)) || el.dataset.checkout;
            if (isCheckout) {
              el.setAttribute('href', CHECKOUT_URL);
              el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const u = new URL(CHECKOUT_URL);
                const p = new URLSearchParams(window.location.search);
                ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck'].forEach(k => {
                  if (p.get(k)) u.searchParams.set(k, p.get(k));
                });
                window.location.href = u.toString();
              }, true);
            }
          }

          function patchButton(el) {
             if (!CHECKOUT_URL) return;
             const text = (el.textContent || '').toLowerCase();
             const isBuy = ['comprar','adquirir','garantir','quero','assinar','buy'].some(t => text.includes(t));
             if (isBuy) {
                el.addEventListener('click', (e) => {
                   e.preventDefault();
                   window.location.href = CHECKOUT_URL;
                }, true);
             }
          }

          // Monitorar DOM para novos elementos
          const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
              m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.tagName === 'A') patchLink(node);
                node.querySelectorAll('a').forEach(patchLink);
                if (node.tagName === 'BUTTON') patchButton(node);
                node.querySelectorAll('button').forEach(patchButton);
              });
            });
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });

          // Patch inicial
          document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('a').forEach(patchLink);
            document.querySelectorAll('button').forEach(patchButton);
          });
        })();
      </script>
    `;
    $('head').prepend(engineScript);

    // ═══════════════════════════════════════════════
    // ASSETS — Reescrever tudo para absoluto via Proxy
    // ═══════════════════════════════════════════════

    $('[src], [href], [srcset]').each((_, el) => {
      const tag = $(el).prop('tagName');
      const attr = $(el).attr('src') ? 'src' : ($(el).attr('href') ? 'href' : 'srcset');
      let val = $(el).attr(attr) || '';

      if (val.startsWith('data:') || val.startsWith('#') || val.startsWith('javascript:')) return;

      // Converter relativo → absoluto
      if (!val.startsWith('http') && !val.startsWith('//')) {
        val = val.startsWith('/') ? baseUrl + val : baseUrl + '/' + val;
      }

      // Proxiar Scripts e Styles para evitar CORS/Integrity
      if (tag === 'SCRIPT' || (tag === 'LINK' && $(el).attr('rel') === 'stylesheet')) {
        const proxied = `/api/proxy?url=${encodeURIComponent(val)}&overrideHost=${targetHost}`;
        $(el).attr(attr, proxied);
        $(el).removeAttr('integrity');
        $(el).removeAttr('crossorigin');
      } else {
        $(el).attr(attr, val);
      }
    });

    // Injetar Pixels
    if (config.pixel_script) $('head').append(config.pixel_script);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    return new NextResponse($.html(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    return new NextResponse(`Erro: ${error.message}`, { status: 500 });
  }
}
