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
    // 1. Fetch LIVE HTML from original_url
    const response = await fetch(quiz.original_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      },
      next: { revalidate: 60 } // Cache por 60 segundos para performance
    });

    if (!response.ok) {
       throw new Error(`Erro ao buscar o site original: ${response.status}`);
    }

    const htmlBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const rawHtml = decoder.decode(htmlBuffer);

    // 2. Parse and Inject
    const $ = cheerio.load(rawHtml);
    const baseUrlObj = new URL(quiz.original_url);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
    const replacements = quiz.theme_config?.replacements || {};

    const safeGuardV7 = `
      <script>window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements).replace(/</g, '\\u003c')};</script>
      <script id="god-mode-v7">
        console.log("God Mode v7 Ativado - Proxy + Mutation Dictionary (LIVE PROXY)");
        
        // Salvar os parâmetros originais ANTES de limpar a URL
        const __ORIGINAL_SEARCH__ = window.location.search;
        const __ORIGINAL_PARAMS__ = new URLSearchParams(window.location.search);
        try { window.history.replaceState(null, '', '/' + window.location.search); } catch(e) {}

        const proxyUrl = '/api/proxy?url=';
        const targetBaseUrl = '${baseUrl}';

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
            // 1. Processar estilos customizados
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
              if (n.nodeType === 3) { // Text node
                const val = n.nodeValue?.trim();
                if (val && window.QUIZ_REPLACEMENTS[val]) {
                  const newVal = window.QUIZ_REPLACEMENTS[val];
                  if (typeof newVal === 'string' && !newVal.startsWith('__STYLE__::') && !newVal.startsWith('http')) {
                    n.nodeValue = n.nodeValue.replace(val, newVal);
                  }
                }
              } else if (n.nodeType === 1) { // Element node
                if (n.hasAttribute('href')) {
                   const href = n.getAttribute('href');
                   if (href && window.QUIZ_REPLACEMENTS[href]) {
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
          
          let hasMeaningfulChange = false;
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => {
                applyReplacements(node);
                hasMeaningfulChange = true;
              });
            } else if (mutation.type === 'characterData') {
              const oldVal = mutation.target.nodeValue?.trim();
              if (oldVal && window.QUIZ_REPLACEMENTS[oldVal]) {
                 applyReplacements(mutation.target.parentNode || mutation.target);
                 hasMeaningfulChange = true;
              }
            } else if (mutation.type === 'attributes') {
              const attr = mutation.attributeName;
              if (attr === 'href' || attr === 'src') {
                 const val = mutation.target.getAttribute(attr);
                 if (val && window.QUIZ_REPLACEMENTS[val]) {
                    applyReplacements(mutation.target);
                    hasMeaningfulChange = true;
                 }
              }
            }
          });
        });

        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['href', 'src']
        });

        // HACK: Preparar a URL preservando os parâmetros da Utmify
        const prepareCheckoutUrl = (customUrl) => {
           let finalUrl = customUrl || window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'];
           if (!finalUrl) return null;
           
           try {
              const urlObj = new URL(finalUrl);
              
              // 1. Repassar os parâmetros originais da URL (salvos antes do replaceState)
              const paramsToForward = __ORIGINAL_PARAMS__ || new URLSearchParams(window.location.search);
              paramsToForward.forEach((value, key) => {
                 if (!urlObj.searchParams.has(key)) {
                    urlObj.searchParams.set(key, value);
                 }
              });

              // 2. Tentar roubar parâmetros de rastreamento (UTMs, xcod, sck, etc) de links já decorados pela Utmify
              const decoratedLink = document.querySelector('a[href*="xcod="], a[href*="utm_source="], a[href*="sck="]');
              if (decoratedLink) {
                 try {
                    const decUrl = new URL(decoratedLink.href);
                    decUrl.searchParams.forEach((value, key) => {
                       if (!urlObj.searchParams.has(key)) {
                          urlObj.searchParams.set(key, value);
                       }
                    });
                 } catch(err) {}
              }

              return urlObj.toString();
           } catch(err) {
              if (__ORIGINAL_SEARCH__) {
                 return finalUrl + (finalUrl.includes('?') ? '&' : '?') + __ORIGINAL_SEARCH__.substring(1);
              }
              return finalUrl;
           }
        };

        // HACK: Interceptação Agressiva de Checkout
        const forceCheckout = (e, customUrl) => {
          const finalUrl = prepareCheckoutUrl(customUrl);
          if (finalUrl) {
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            
            console.log("God Mode: Redirecionando para " + finalUrl);
            window.location.href = finalUrl;
            return true;
          }
          return false;
        };

        // Interceptar clicks em qualquer coisa que pareça um gatilho de checkout
        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"], div, span');
          if (!target) return;

          const text = target.textContent?.toLowerCase() || '';
          const href = target.getAttribute('href') || '';
          const btnId = target.getAttribute('id') || '';
          const btnClass = target.getAttribute('class') || '';
          
          // Verificar se a URL já é o nosso checkout (decorado ou não)
          const r = window.QUIZ_REPLACEMENTS;
          const checkoutBases = [
             r['__CHECKOUT_URL__'],
             r['__CHECKOUT_PLAN_1__'],
             r['__CHECKOUT_PLAN_2__'],
             r['__CHECKOUT_PLAN_3__']
          ].filter(Boolean).map(u => {
             try { const obj = new URL(u); return obj.origin + obj.pathname; } 
             catch(err) { return u; }
          });

          let isAlreadyOurCheckout = false;
          if (href) {
             try {
                const hrefObj = new URL(href, window.location.origin);
                const hrefBase = hrefObj.origin + hrefObj.pathname;
                isAlreadyOurCheckout = checkoutBases.includes(hrefBase);
             } catch(err) {}
          }
          
          // Verificar se este link/botão específico tem uma substituição individual
          const specificUrl = (href && window.QUIZ_REPLACEMENTS[href]) 
            || (btnId && window.QUIZ_REPLACEMENTS[btnId]) 
            || (btnClass && window.QUIZ_REPLACEMENTS[btnClass])
            || null;
          
          // Se o texto contiver palavras de checkout ou o link for para um checkout conhecido
          const isCheckoutTrigger = 
            isAlreadyOurCheckout ||
            text.includes('comprar') || 
            text.includes('checkout') || 
            text.includes('receber agora') ||
            text.includes('obter acesso') ||
            text.includes('receber o meu') ||
            text.includes('receber') ||
            text.includes('quero o plano') ||
            text.includes('quero o plano de') ||
            text.includes('quero o plano anual') ||
            href.includes('pay.') || 
            href.includes('checkout') ||
            href.includes('cakto') ||
            href.includes('kirvano') ||
            href.includes('perfectpay');

          if (isCheckoutTrigger || specificUrl) {
            // Multi-Checkout: tentar identificar qual plano foi clicado pelo texto
            let planUrl = specificUrl;
            
            if (!planUrl) {
              if (isAlreadyOurCheckout) {
                 // Já é o nosso checkout, possivelmente decorado com UTMs pela Utmify. Usar como base!
                 planUrl = href;
              } else {
                 if (text.includes('1 m') || text.includes('mensal') || text.includes('plano de 1')) {
                   planUrl = r['__CHECKOUT_PLAN_1__'];
                 } else if (text.includes('3 m') || text.includes('trimestral') || text.includes('plano de 3')) {
                   planUrl = r['__CHECKOUT_PLAN_2__'];
                 } else if (text.includes('anual') || text.includes('12 m') || text.includes('plano anual')) {
                   planUrl = r['__CHECKOUT_PLAN_3__'];
                 }
              }
            }
            forceCheckout(e, planUrl);
          }
        }, true);

        // Hook window.open e window.location via Proxy de Navegação
        const origOpen = window.open;
        window.open = function(url, target, features) {
          if (window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'] && typeof url === 'string') {
            if (url.includes('pay.') || url.includes('checkout') || !url.includes(window.location.hostname)) {
              const finalUrl = prepareCheckoutUrl(window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__']);
              if (finalUrl) {
                 return origOpen.call(window, finalUrl, target, features);
              }
            }
          }
          return origOpen.call(window, url, target, features);
        };

        // Inject Pixel Script se existir
        if (window.QUIZ_REPLACEMENTS['__PIXEL_SCRIPT__']) {
            const pixelScript = document.createElement('div');
            pixelScript.innerHTML = window.QUIZ_REPLACEMENTS['__PIXEL_SCRIPT__'];
            Array.from(pixelScript.childNodes).forEach(node => {
               if (node.tagName === 'SCRIPT') {
                  const s = document.createElement('script');
                  s.innerHTML = node.innerHTML;
                  if (node.src) s.src = node.src;
                  document.head.appendChild(s);
               } else {
                  document.body.appendChild(node);
               }
            });
        }

        // OVERLAY KILLER: Remove divs de loading/overlay que bloqueiam o conteúdo
        // Sites como inlead.digital usam uma div fixa z-[1000] que nunca é removida se os scripts falham
        function killOverlays() {
          const overlays = document.querySelectorAll('div.fixed, div[style*="position: fixed"], div[style*="position:fixed"]');
          overlays.forEach(el => {
            const style = window.getComputedStyle(el);
            const zIndex = parseInt(style.zIndex) || 0;
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            const children = el.children.length;
            const text = (el.textContent || '').trim();
            // Se é um overlay: fixo, z-index alto, cobre a tela toda, sem conteúdo visível
            if (zIndex >= 900 && width >= window.innerWidth * 0.9 && height >= window.innerHeight * 0.9 && children === 0 && text.length === 0) {
              console.log('God Mode: Overlay Killer removeu div bloqueante z-index=' + zIndex);
              el.remove();
            }
          });
        }
        // Executar em intervalos para pegar overlays injetados dinamicamente
        setTimeout(killOverlays, 2000);
        setTimeout(killOverlays, 4000);
        setTimeout(killOverlays, 8000);

        document.addEventListener('DOMContentLoaded', () => {
          applyReplacements(document.body);
          // Também executar overlay killer após DOM pronto
          setTimeout(killOverlays, 1000);
        });

        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'SYNC_REPLACEMENTS') {
             window.QUIZ_REPLACEMENTS = e.data.replacements;
             applyReplacements(document.body);
          }
        });
      </script>
    `;

    $('head').prepend(safeGuardV7);
    
    // Injetar o script da Utmify UTMs diretamente no quiz proxeado
    // O layout.tsx só cobre o dashboard, então precisamos injetar aqui também
    $('head').append(`
<!-- UTMIFY UTMs TRACKING -->
<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
`);

    const themeConfig = quiz.theme_config || {};
    if (themeConfig.head_scripts) {
      $('head').append(`\n<!-- INJECTED HEAD SCRIPTS -->\n${themeConfig.head_scripts}\n`);
    }
    if (themeConfig.body_scripts) {
      $('body').append(`\n<!-- INJECTED BODY SCRIPTS -->\n${themeConfig.body_scripts}\n`);
    }
    
    // FIX DE ASSETS Absolutos
    $('[src^="/"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('//')) {
        $(el).attr('src', baseUrl + src);
      }
    });
    $('[href^="/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('//')) {
        $(el).attr('href', baseUrl + href);
      }
    });
    $('[srcset]').each((_, el) => {
      let srcset = $(el).attr('srcset');
      if (srcset) {
        srcset = srcset.split(',').map(s => {
          let parts = s.trim().split(' ');
          if (parts[0].startsWith('/')) parts[0] = baseUrl + parts[0];
          return parts.join(' ');
        }).join(', ');
        $(el).attr('srcset', srcset);
      }
    });

    $('script').each((_, el) => {
      const src = $(el).attr('src') || '';
      const content = $(el).html() || '';
      if (src.includes('anti-clone') || content.includes('debugger')) {
        $(el).remove();
      } else if (src && src.includes('.js')) {
         // Proxy JS files to replace location.hostname!
         const absoluteSrc = src.startsWith('/') ? baseUrl + src : src;
         $(el).attr('src', `/api/proxy?url=${encodeURIComponent(absoluteSrc)}&overrideHost=${encodeURIComponent(baseUrlObj.hostname)}`);
      }
    });

    const finalHtml = $.html();

    return new NextResponse(finalHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy': "frame-ancestors *;",
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      },
    });

  } catch (err: any) {
    console.error('Dynamic Proxy Error:', err);
    return new NextResponse(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Erro ao carregar o site original.</h2>
        <p>${err.message}</p>
      </div>
    `, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
