import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const { data: quiz, error } = await supabaseAdmin
    .from('quizzes')
    .select('theme_config, original_url')
    .eq('id', params.id)
    .single();

  if (error || !quiz || !quiz.original_url) {
    return new NextResponse('Quiz não encontrado ou sem URL original', { status: 404 });
  }

  // Grava a visualização de forma assíncrona (não usa await para não atrasar o carregamento)
  supabaseAdmin.from('quiz_views').insert([{ quiz_id: params.id }]).then(({error}) => {
     if (error) console.error('Erro ao registrar view:', error);
  });

  try {
    const themeConfig = quiz.theme_config || {};
    let rawHtml = themeConfig.rawHtml || '';
    const replacements = themeConfig.replacements || {};
    
    // Se não houver HTML salvo (funis muito antigos ou erro na clonagem), faz fallback para iframe
    if (!rawHtml) {
        return new NextResponse(`
        <!DOCTYPE html>
        <html><head>
          <style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style>
          <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
        </head><body>
          <iframe src="${quiz.original_url}" style="border:none;width:100%;height:100%;"></iframe>
        </body></html>
        `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // O rawHtml salvo no banco pode ou não ter o God Mode antigo. Vamos limpá-lo se tiver para usar o mais novo.
    rawHtml = rawHtml.replace(/<script id="god-mode-v7">[\s\S]*?<\/script>/i, '');
    rawHtml = rawHtml.replace(/<!-- OVERLAY DE EDIÇÃO SNAPFUNNEL -->[\s\S]*?<\/div>/i, '');

    const baseUrlObj = new URL(quiz.original_url);
    const targetHost = encodeURIComponent(baseUrlObj.hostname);
    
    // FIX DE ASSETS: Passar todos os scripts do site original pelo nosso proxy CORS para burlar bloqueios de Hotlinking
    rawHtml = rawHtml.replace(/<script([^>]+)src=["']([^"']+\.js)["']([^>]*)>/gi, (match: string, prefix: string, src: string, suffix: string) => {
        if (!src.includes('/api/proxy') && !src.includes('utmify')) {
            const absoluteSrc = src.startsWith('/') ? baseUrlObj.origin + src : src;
            const proxiedSrc = `/api/proxy?url=${encodeURIComponent(absoluteSrc)}&overrideHost=${targetHost}`;
            return `<script${prefix}src="${proxiedSrc}"${suffix}>`;
        }
        return match;
    });
    
    const safeGuardV7_1 = `
      <!-- OVERLAY DE EDIÇÃO SNAPFUNNEL -->
      <div id="sf-edit-overlay" style="position:fixed;inset:0;z-index:999999;display:none;pointer-events:none;cursor:crosshair;background:rgba(59,130,246,0.1);border:3px dashed rgba(59,130,246,0.8);box-sizing:border-box;"></div>
      
      <script>window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements).replace(/</g, '\\u003c')};</script>
      <script id="god-mode-v7">
        console.log("God Mode v7.2 Ativado - Anti-Crash + Persistência");
        
        // VACINA CONTRA TELA BRANCA E FLICKER DO NEXT.JS
        const n = () => {};
        try { Object.defineProperty(window.history, 'pushState', { value: n, writable: false }); } catch(e) {}
        try { Object.defineProperty(window.history, 'replaceState', { value: n, writable: false }); } catch(e) {}

        const proxyUrl = '/api/proxy?url=';
        const targetBaseUrl = '${quiz.original_url ? new URL(quiz.original_url).origin : ""}';

        const _origFetch = window.fetch;
        window.fetch = async function() {
          let [resource, config] = arguments;
          if (typeof resource === 'string') {
            if (resource.startsWith('/')) {
              resource = proxyUrl + encodeURIComponent(targetBaseUrl + resource);
            } else if (resource.startsWith(targetBaseUrl)) {
              resource = proxyUrl + encodeURIComponent(resource);
            }
          } else if (resource instanceof Request) {
             const urlObj = new URL(resource.url, window.location.origin);
             if(urlObj.origin === window.location.origin && urlObj.pathname.startsWith('/')) {
                resource = new Request(proxyUrl + encodeURIComponent(targetBaseUrl + urlObj.pathname + urlObj.search), resource);
             } else if (urlObj.origin === targetBaseUrl) {
                resource = new Request(proxyUrl + encodeURIComponent(resource.url), resource);
             }
          }
          return _origFetch.call(this, resource, config);
        };

        const _origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
          if (typeof url === 'string') {
            if (url.startsWith('/')) {
              url = proxyUrl + encodeURIComponent(targetBaseUrl + url);
            } else if (url.startsWith(targetBaseUrl)) {
              url = proxyUrl + encodeURIComponent(url);
            }
          }
          return _origOpen.call(this, method, url, async, user, password);
        };

        window.__IS_APPLYING__ = false;

        function applyReplacements(node) {
          if (!node || window.__IS_APPLYING__) return;
          
          window.__IS_APPLYING__ = true;
          try {
            Object.keys(window.QUIZ_REPLACEMENTS).forEach(key => {
              if (key.startsWith('__STYLE__::')) {
                const selector = key.replace('__STYLE__::', '');
                const styles = window.QUIZ_REPLACEMENTS[key];
                try {
                  document.querySelectorAll(selector).forEach(el => {
                    const existingStyle = el.getAttribute('style') || '';
                    if (!existingStyle.includes(styles)) {
                      el.setAttribute('style', existingStyle + (existingStyle.endsWith(';') ? '' : ';') + styles);
                    }
                  });
                } catch(e) {}
              }
            });

            const walk = (n) => {
              if (n.nodeType === 3) { 
                const val = n.nodeValue?.trim();
                if (val && window.QUIZ_REPLACEMENTS[val]) {
                  const newVal = window.QUIZ_REPLACEMENTS[val];
                  if (typeof newVal === 'string' && !newVal.startsWith('__STYLE__::') && !newVal.startsWith('http')) {
                    n.nodeValue = n.nodeValue.replace(val, newVal);
                  }
                }
              } else if (n.nodeType === 1) { 
                if (n.hasAttribute('href')) {
                   let href = n.getAttribute('href');
                   const isCheckout = href.includes('pay.') || href.includes('checkout') || href.includes('cakto') || href.includes('kirvano') || href.includes('perfectpay') || href.includes('kiwify');
                   if (isCheckout && window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__']) {
                      n.setAttribute('href', window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__']);
                   } else if (href && window.QUIZ_REPLACEMENTS[href]) {
                      n.setAttribute('href', window.QUIZ_REPLACEMENTS[href]);
                   }
                }

                if (n.tagName === 'IMG' && n.hasAttribute('src')) {
                   const src = n.getAttribute('src');
                   if (src && window.QUIZ_REPLACEMENTS[src]) {
                      n.setAttribute('src', window.QUIZ_REPLACEMENTS[src]);
                   }
                }
                n.childNodes.forEach(walk);
              }
            };
            
            if (node !== null) walk(node);
          } finally {
            window.__IS_APPLYING__ = false;
          }
        }

        const observer = new MutationObserver((mutations) => {
          if (window.__IS_APPLYING__) return;
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => applyReplacements(node));
            } else if (mutation.type === 'characterData') {
              const oldVal = mutation.target.nodeValue?.trim();
              if (oldVal && window.QUIZ_REPLACEMENTS[oldVal]) {
                 applyReplacements(mutation.target.parentNode || mutation.target);
              }
            } else if (mutation.type === 'attributes') {
              const attr = mutation.attributeName;
              if (attr === 'href' || attr === 'src') {
                 const val = mutation.target.getAttribute(attr);
                 if (val && window.QUIZ_REPLACEMENTS[val]) {
                    applyReplacements(mutation.target);
                 }
              }
            }
          });
        });

        observer.observe(document.documentElement, {
          childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'src']
        });

        const prepareCheckoutUrl = (customUrl) => {
           let finalUrl = customUrl || window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'];
           if (!finalUrl) return null;
           try {
              const urlObj = new URL(finalUrl);
              const paramsToForward = new URLSearchParams(window.location.search);
              paramsToForward.forEach((value, key) => {
                 if (!urlObj.searchParams.has(key)) urlObj.searchParams.set(key, value);
              });
              const decoratedLink = document.querySelector('a[href*="xcod="], a[href*="utm_source="], a[href*="sck="]');
              if (decoratedLink) {
                 try {
                    const decUrl = new URL(decoratedLink.href);
                    decUrl.searchParams.forEach((value, key) => {
                       if (!urlObj.searchParams.has(key)) urlObj.searchParams.set(key, value);
                    });
                 } catch(err) {}
              }
              return urlObj.toString();
           } catch(err) {
              return finalUrl;
           }
        };

        const forceCheckout = (e, customUrl) => {
          const finalUrl = prepareCheckoutUrl(customUrl);
          if (finalUrl) {
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            window.location.href = finalUrl;
            return true;
          }
          return false;
        };

        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"], div, span');
          if (!target) return;

          const text = target.textContent?.toLowerCase() || '';
          const href = target.getAttribute('href') || '';
          const btnId = target.getAttribute('id') || '';
          const btnClass = target.getAttribute('class') || '';
          
          const r = window.QUIZ_REPLACEMENTS;
          const checkoutBases = [r['__CHECKOUT_URL__'], r['__CHECKOUT_PLAN_1__'], r['__CHECKOUT_PLAN_2__'], r['__CHECKOUT_PLAN_3__']].filter(Boolean).map(u => {
             try { const obj = new URL(u); return obj.origin + obj.pathname; } catch(err) { return u; }
          });

          let isAlreadyOurCheckout = false;
          if (href) {
             try {
                const hrefObj = new URL(href, window.location.origin);
                isAlreadyOurCheckout = checkoutBases.includes(hrefObj.origin + hrefObj.pathname);
             } catch(err) {}
          }
          
          const specificUrl = (href && window.QUIZ_REPLACEMENTS[href]) || (btnId && window.QUIZ_REPLACEMENTS[btnId]) || (btnClass && window.QUIZ_REPLACEMENTS[btnClass]) || null;
          
          const isCheckoutTrigger = isAlreadyOurCheckout || text.includes('comprar') || text.includes('checkout') || text.includes('receber agora') || text.includes('obter acesso') || text.includes('quero o plano') || href.includes('pay.') || href.includes('checkout') || href.includes('cakto') || href.includes('kirvano') || href.includes('perfectpay') || href.includes('kiwify');

          if (isCheckoutTrigger || specificUrl) {
            let planUrl = specificUrl;
            if (!planUrl) {
              if (isAlreadyOurCheckout) planUrl = href;
              else if (text.includes('1 m') || text.includes('mensal')) planUrl = r['__CHECKOUT_PLAN_1__'];
              else if (text.includes('3 m') || text.includes('trimestral')) planUrl = r['__CHECKOUT_PLAN_2__'];
              else if (text.includes('anual') || text.includes('12 m')) planUrl = r['__CHECKOUT_PLAN_3__'];
            }
            forceCheckout(e, planUrl);
          }
        }, true);

        const origOpen = window.open;
        window.open = function(url, target, features) {
          if (window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'] && typeof url === 'string') {
            if (url.includes('pay.') || url.includes('checkout') || !url.includes(window.location.hostname)) {
              const finalUrl = prepareCheckoutUrl(window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__']);
              if (finalUrl) return origOpen.call(window, finalUrl, target, features);
            }
          }
          return origOpen.call(window, url, target, features);
        };

        // INJEÇÃO BLINDADA DO PIXEL COM TRY-CATCH
        if (window.QUIZ_REPLACEMENTS['__PIXEL_SCRIPT__']) {
            try {
                const pixelScript = document.createElement('div');
                pixelScript.innerHTML = window.QUIZ_REPLACEMENTS['__PIXEL_SCRIPT__'];
                Array.from(pixelScript.childNodes).forEach(node => {
                   try {
                       if (node.tagName === 'SCRIPT') {
                          const s = document.createElement('script');
                          s.innerHTML = node.innerHTML;
                          if (node.src) s.src = node.src;
                          document.head.appendChild(s);
                       } else {
                          document.body.appendChild(node);
                       }
                   } catch(err) { console.warn('Erro ao injetar nó do Pixel:', err); }
                });
            } catch(e) { console.warn('Erro fatal no script do Pixel do usuário:', e); }
        }

        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'SYNC_REPLACEMENTS') {
             window.QUIZ_REPLACEMENTS = e.data.replacements;
             applyReplacements(document.body);
          }
          if (e.data && e.data.type === 'SET_MODE') {
             const overlay = document.getElementById('sf-edit-overlay');
             if (overlay) {
                const active = !!e.data.isEditMode;
                overlay.style.display = active ? 'block' : 'none';
                overlay.style.pointerEvents = active ? 'all' : 'none';
             }
          }
        });

        document.addEventListener('DOMContentLoaded', () => {
          applyReplacements(document.body);
          const overlay = document.getElementById('sf-edit-overlay');
          if (overlay) {
             overlay.addEventListener('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                window.parent.postMessage({ type: 'IFRAME_CLICK', x: e.clientX, y: e.clientY }, '*');
             });
          }
        });
      </script>
    `;

    // Inserir as variáveis dinâmicas logo após o <head>
    rawHtml = rawHtml.replace(/<head[^>]*>/i, (match: string) => match + safeGuardV7_1);

    // Inserir scripts adicionais (se houver)
    if (themeConfig.head_scripts) {
       rawHtml = rawHtml.replace('</head>', `\n<!-- HEAD SCRIPTS -->\n${themeConfig.head_scripts}\n</head>`);
    }
    if (themeConfig.body_scripts) {
       rawHtml = rawHtml.replace('</body>', `\n<!-- BODY SCRIPTS -->\n${themeConfig.body_scripts}\n</body>`);
    }

    return new NextResponse(rawHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *;"
      },
    });

  } catch (err: any) {
    console.error('Render Error:', err);
    return new NextResponse(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Erro ao carregar o site clonado do banco de dados.</h2>
        <p>${err.message}</p>
      </div>
    `, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
