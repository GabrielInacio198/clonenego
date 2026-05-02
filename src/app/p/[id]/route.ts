import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode v3.0 — A versão mais estável e compatível
 * 
 * Estratégia:
 * 1. Usa <base> tag para resolver 99% dos assets (imagens, fontes, caminhos relativos).
 * 2. Proxiia APENAS scripts e estilos que estão no mesmo domínio do site original (para evitar CORS).
 * 3. Usa URL absoluta para o proxy (/api/proxy) para não ser afetado pela <base> tag.
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

    // 2. Fetch LIVE do HTML
    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return new NextResponse(`<h1>Erro ao acessar o site original (${response.status})</h1>`, { status: 502 });
    }

    const htmlBuffer = await response.arrayBuffer();
    const rawHtml = new TextDecoder('utf-8').decode(htmlBuffer);

    if (!rawHtml || rawHtml.trim().length === 0) {
      return new NextResponse(`<h1>O site original retornou um conteúdo vazio. Verifique a URL.</h1>`, { status: 502 });
    }

    const $ = cheerio.load(rawHtml);
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
    const targetHost = baseUrlObj.host;
    const currentOrigin = req.nextUrl.origin;

    // ═══════════════════════════════════════════════
    // 1. LIMPEZA E PREPARAÇÃO
    // ═══════════════════════════════════════════════
    
    // Remover qualquer <base> tag existente para não conflitar com a nossa
    $('base').remove();
    
    // Adicionar nossa <base> tag no topo do <head>
    // Isso resolve automaticamente links de imagens, fontes e caminhos relativos de JS/CSS
    $('head').prepend(`<base href="${baseUrl}/">`);

    // ═══════════════════════════════════════════════
    // 2. ENGINE DE PROXY (Injetar no topo)
    // ═══════════════════════════════════════════════

    const engineScript = `
      <script id="snapfunnel-god-mode">
        (function() {
          console.log("SnapFunnel God Mode v3.0 Ativo");
          const TARGET_HOST = '${targetHost}';
          const TARGET_ORIGIN = '${baseUrl}';
          const PROXY_URL = '${currentOrigin}/api/proxy?url=';
          const CHECKOUT_URL = '${checkoutUrl}';

          // SPOOFING DE DOMÍNIO
          try {
            Object.defineProperty(window.location, 'hostname', { get: () => TARGET_HOST, configurable: true });
            Object.defineProperty(window.location, 'host', { get: () => TARGET_HOST, configurable: true });
            Object.defineProperty(window.location, 'origin', { get: () => TARGET_ORIGIN, configurable: true });
            document.domain = TARGET_HOST;
          } catch(e) {}

          // PROXY DE FETCH/XHR (Para chamadas de API do site original funcionarem)
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

          // INTERCEPTADOR DE CHECKOUT (MutationObserver para capturar TUDO)
          const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
          
          function patch(el) {
            if (!CHECKOUT_URL) return;
            if (el.tagName === 'A') {
              const hrefAttr = el.getAttribute('href') || '';
              const href = hrefAttr.toLowerCase();
              
              // TRATAMENTO DE ÂNCORAS: Impedir que a <base> tag redirecione para fora
              if (hrefAttr.startsWith('#')) {
                el.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const target = document.querySelector(hrefAttr);
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                    else window.location.hash = hrefAttr;
                  } catch(err) {
                    console.warn("Erro ao rolar para âncora:", err);
                  }
                }, true);
                return;
              }
              
              if (gateways.some(g => href.includes(g)) || el.dataset.checkout) {
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
              if (['comprar','adquirir','garantir','quero','assinar','buy'].some(t => text.includes(t))) {
                el.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  window.location.href = CHECKOUT_URL;
                }, true);
              }
            }
          }

          const obs = new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => {
            if (n.nodeType === 1) { patch(n); n.querySelectorAll('a, button').forEach(patch); }
          })));
          obs.observe(document.documentElement, { childList: true, subtree: true });
          document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('a, button').forEach(patch));
        })();
      </script>
    `;
    $('head').prepend(engineScript);

    // ═══════════════════════════════════════════════
    // 3. PROCESSAMENTO DE ASSETS E CHECKOUT
    // ═══════════════════════════════════════════════

    const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];

    $('[src], [href]').each((_, el) => {
      const tag = $(el).prop('tagName');
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr) || '';

      if (!val || val.startsWith('data:') || val.startsWith('javascript:')) return;

      // REESCRITA DE ÂNCORAS (Para evitar redirecionamento por causa da <base> tag)
      if (val.startsWith('#')) {
        $(el).attr(attr, `javascript:document.querySelector('${val}')?.scrollIntoView({behavior:'smooth'})`);
        return;
      }

      // REESCRITA DE CHECKOUT (Física)
      // Pulamos links que começam com # (âncoras internas)
      if (tag === 'A' && checkoutUrl && !val.startsWith('#')) {
        const lowerVal = val.toLowerCase();
        if (gateways.some(g => lowerVal.includes(g)) || $(el).data('checkout')) {
          $(el).attr(attr, checkoutUrl);
          return; // Não processar como asset se for checkout
        }
      }

      // SÓ proxiamos Scripts e Styles (todos, para garantir que o CSS rewrite funcione)
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
    if (config.pixel_script) $('head').append(config.pixel_script);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Powered-By': 'SnapFunnel God Mode v3.0',
      },
    });

  } catch (error: any) {
    console.error('Proxy Error:', error);
    return new NextResponse(`Erro fatal no proxy: ${error.message}`, { status: 500 });
  }
}
