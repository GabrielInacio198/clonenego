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
    let rawHtml = '';
    const replacements = themeConfig.replacements || {};
    
    // FETCH LIVE HTML: Garante que os chunks JS de sites Next.js (SPA) estejam sempre atualizados!
    try {
        const response = await fetch(quiz.original_url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            next: { revalidate: 60 },
        });
        
        if (response.ok) {
            rawHtml = await response.text();
            
            // Opcional: Atualiza o backup no banco em background apenas se o HTML mudou
            if (rawHtml.length > 500 && themeConfig.rawHtml !== rawHtml) {
               supabaseAdmin.from('quizzes').update({
                  theme_config: { ...themeConfig, rawHtml }
               }).eq('id', params.id).then();
            }
        } else {
            throw new Error('Status ' + response.status);
        }
    } catch (err) {
        console.error('Falha ao buscar HTML ao vivo, usando fallback do banco:', err);
        rawHtml = themeConfig.rawHtml || '';
    }
    
    // Se não houver HTML nem ao vivo nem salvo, faz fallback para iframe
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

    // O rawHtml pode ter o God Mode antigo injetado se veio do banco. Vamos limpá-lo.
    rawHtml = rawHtml.replace(/<script id="god-mode-v7">[\s\S]*?<\/script>/gi, '');
    rawHtml = rawHtml.replace(/<!-- OVERLAY DE EDIÇÃO SNAPFUNNEL -->[\s\S]*?<\/div>/gi, '');

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
      <script>window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements).replace(/</g, '\\u003c')};</script>
      <script id="snap-sticker-capture">
        // SnapFunnel: Captura de figurinha — roda ANTES do God Mode para ter o fetch real
        (function() {
          // Salva o fetch REAL antes do God Mode fazer o monkey-patch
          window.__snapRealFetch__ = window.fetch.bind(window);
          window.__SNAP_QUIZ_ID__ = "${params.id}";

          // Intercepta sessionStorage.setItem para capturar a figurinha gerada
          var _origSetItem = sessionStorage.setItem.bind(sessionStorage);
          sessionStorage.setItem = function(key, value) {
            _origSetItem(key, value);
            try {
              if (key === 'sticker-generated' && value && value.startsWith('data:image')) {
                // Lê os dados preenchidos no quiz
                var quizRaw = sessionStorage.getItem('quiz-data') || '{}';
                var quizData = {};
                try { quizData = JSON.parse(quizRaw); } catch(e) {}
                // Monta os dados de nascimento se disponíveis
                if (quizData.dia && quizData.mes && quizData.ano) {
                  quizData.nascimento = quizData.dia + '/' + quizData.mes + '/' + quizData.ano;
                }
                // Envia para nossa API usando o fetch REAL (não interceptado pelo God Mode)
                window.__snapRealFetch__('/api/sticker/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    imageDataUrl: value,
                    quizId: window.__SNAP_QUIZ_ID__,
                    quizData: {
                      nome: quizData.nome || '',
                      email: quizData.email || '',
                      clube: quizData.clube || '',
                      peso: quizData.peso || '',
                      altura: quizData.altura || '',
                      nascimento: quizData.nascimento || ''
                    }
                  })
                }).then(function(r) {
                  if (r.ok) { console.log('[SnapFunnel] Figurinha capturada com sucesso!'); }
                  else { console.warn('[SnapFunnel] Falha ao salvar figurinha, status:', r.status); }
                }).catch(function(err) {
                  console.warn('[SnapFunnel] Erro ao salvar figurinha:', err);
                });
              }
            } catch(captureErr) {
              console.warn('[SnapFunnel] Erro no interceptor de sticker:', captureErr);
            }
          };
        })();
      </script>
      <script id="god-mode-v7">
        console.log("God Mode v7.4 Ativado - Anti-Crash + SPA Live Fetch");

        
        window.__PROXY_HOST__ = "${targetHost}";
        window.__PROXY_ORIGIN__ = "https://${targetHost}";
        
        // TRUQUE DE HIDRATAÇÃO PARA SPAs (Next.js, React, etc.)
        // O Next.js lê window.location.pathname no boot. Se não bater com a rota original, ele dá tela branca (404) ou erro.
        const origReplaceState = window.history.replaceState;
        const origPushState = window.history.pushState;
        
        const originalUrlObj = new URL('${quiz.original_url}');
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        
        if (currentPath !== originalUrlObj.pathname) {
           // 1. Muda a URL na barra para a original antes do framework carregar
           origReplaceState.call(window.history, null, '', originalUrlObj.pathname + currentSearch);
           
           // 2. Restaura a URL correta após o framework terminar de hidratar (1.5s após o load)
           const restoreUrl = () => origReplaceState.call(window.history, null, '', currentPath + currentSearch);
           window.addEventListener('load', () => setTimeout(restoreUrl, 1500));
           setTimeout(restoreUrl, 4000); // Fallback garantido
        }
        
        // VACINA CONTRA TELA BRANCA E FLICKER DO NEXT.JS (Bloqueia o Next de mudar a URL sozinho depois)
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

        // INTERCEPTAR SCRIPTS/LINKS DINÂMICOS DO WEBPACK/NEXT.JS
        const origCreateElement = document.createElement;
        document.createElement = function(tagName) {
           const el = origCreateElement.call(document, tagName);
           const lowerTag = tagName.toLowerCase();
           if (lowerTag === 'script' || lowerTag === 'link') {
              const origSetAttribute = el.setAttribute;
              el.setAttribute = function(name, value) {
                 if ((name === 'src' || name === 'href') && value) {
                    if (value.startsWith('/')) value = proxyUrl + encodeURIComponent(targetBaseUrl + value);
                    else if (value.startsWith(targetBaseUrl)) value = proxyUrl + encodeURIComponent(value);
                 }
                 return origSetAttribute.call(this, name, value);
              };
              const prop = lowerTag === 'link' ? 'href' : 'src';
              Object.defineProperty(el, prop, {
                 set: function(val) {
                    if (val && typeof val === 'string') {
                       if (val.startsWith('/')) val = proxyUrl + encodeURIComponent(targetBaseUrl + val);
                       else if (val.startsWith(targetBaseUrl)) val = proxyUrl + encodeURIComponent(val);
                    }
                    origSetAttribute.call(this, prop, val);
                 },
                 get: function() { return this.getAttribute(prop); }
              });
           }
           return el;
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
                    const finalValue = n.nodeValue.replace(val, newVal);
                    if (n.nodeValue !== finalValue) {
                      n.nodeValue = finalValue;
                    }
                  }
                }
              } else if (n.nodeType === 1) { 
                if (n.hasAttribute('href')) {
                   let href = n.getAttribute('href');
                   const isCheckout = href.includes('pay.') || href.includes('checkout') || href.includes('cakto') || href.includes('kirvano') || href.includes('perfectpay') || href.includes('kiwify') || href.includes('lastlink');
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
            if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
            window.location.href = finalUrl;
            return true;
          }
          return false;
        };

        // Escudo Máximo na Rota Q (Quizzes): Intercepta no nível da Window antes da Lastlink
        window.addEventListener('click', (e) => {
          if (window.isEditMode) return; // Impede redirecionamentos quando o modo de edição visual está ativo

          const r = window.QUIZ_REPLACEMENTS;
          const checkoutBases = [r['__CHECKOUT_URL__'], r['__CHECKOUT_PLAN_1__'], r['__CHECKOUT_PLAN_2__'], r['__CHECKOUT_PLAN_3__']].filter(Boolean).map(u => {
             try { const obj = new URL(u); return obj.origin + obj.pathname; } catch(err) { return u; }
          });

          // MODO PRECISO: se o usuário definiu o texto exato do botão, usar apenas ele
          const customButtonText = (r['__CHECKOUT_BUTTON_TEXT__'] || '').toLowerCase().trim();

          let currentTarget = e.target;
          let isCheckoutTrigger = false;
          let specificUrl = null;
          let matchedText = '';
          let matchedHref = '';
          let depth = 0;

          while (currentTarget && currentTarget !== document.body && currentTarget !== document.documentElement && depth < 6) {
             const text = currentTarget.textContent?.toLowerCase().trim() || '';
             const href = currentTarget.getAttribute?.('href') || '';
             const btnId = currentTarget.getAttribute?.('id') || '';
             const btnClass = currentTarget.getAttribute?.('class') || '';

             let isAlreadyOurCheckout = false;
             if (href) {
                try {
                   const hrefObj = new URL(href, window.location.origin);
                   isAlreadyOurCheckout = checkoutBases.includes(hrefObj.origin + hrefObj.pathname);
                } catch(err) {}
             }

             specificUrl = (href && r[href]) || (btnId && r[btnId]) || (btnClass && r[btnClass]) || null;

             if (customButtonText) {
               // ── MODO PRECISO ──────────────────────────────────────────────────────────
               // Só aciona se o elemento (até 4 níveis) contém o texto exato informado pelo usuário
               // + continua detectando hrefs de plataformas de pagamento como fallback de segurança
               const hasCustomText = depth < 4 && text.includes(customButtonText);
               if (isAlreadyOurCheckout || hasCustomText || href.includes('pay.') || href.includes('checkout') || href.includes('cakto') || href.includes('kirvano') || href.includes('perfectpay') || href.includes('kiwify') || href.includes('lastlink')) {
                   isCheckoutTrigger = true;
                   matchedText = text;
                   matchedHref = href;
                   break;
               }
             } else {
               // ── MODO GENÉRICO ─────────────────────────────────────────────────────────
               // Usa keywords predefinidas, verificando texto apenas nos 2 primeiros níveis
               // para evitar falsos positivos em quizzes de saúde/dieta
               const hasValidKeywords = depth < 2 && text.length > 0 && text.length < 200 && (
                 text.includes('comprar') ||
                 text.includes('checkout') ||
                 text.includes('receber agora') ||
                 text.includes('obter acesso') ||
                 text.includes('quero o plano') ||
                 text.includes('obter meu plano personalizado')
               );

               // Checagem de href de checkout vai até profundidade 6 (não alterado)
               if (isAlreadyOurCheckout || hasValidKeywords || href.includes('pay.') || href.includes('checkout') || href.includes('cakto') || href.includes('kirvano') || href.includes('perfectpay') || href.includes('kiwify') || href.includes('lastlink')) {
                   isCheckoutTrigger = true;
                   matchedText = text;
                   matchedHref = href;
                   break;
               }
             }
             
             currentTarget = currentTarget.parentElement;
             depth++;
          }

          if (isCheckoutTrigger || specificUrl) {
            let planUrl = specificUrl;
            if (!planUrl) {
              if (matchedHref && checkoutBases.some(b => matchedHref.includes(b))) {
                planUrl = matchedHref;
              } else {
                // MODO PRECISO POR PLANO: verificar textos exatos dos botões por plano (mesma lógica do __CHECKOUT_BUTTON_TEXT__)
                const btnText1 = (r['__CHECKOUT_BUTTON_TEXT_1__'] || '').toLowerCase().trim();
                const btnText2 = (r['__CHECKOUT_BUTTON_TEXT_2__'] || '').toLowerCase().trim();
                const btnText3 = (r['__CHECKOUT_BUTTON_TEXT_3__'] || '').toLowerCase().trim();

                if (btnText1 && matchedText.includes(btnText1)) planUrl = r['__CHECKOUT_PLAN_1__'];
                else if (btnText2 && matchedText.includes(btnText2)) planUrl = r['__CHECKOUT_PLAN_2__'];
                else if (btnText3 && matchedText.includes(btnText3)) planUrl = r['__CHECKOUT_PLAN_3__'];
                else {
                  // MODO GENÉRICO POR PLANO: fallback com keywords predefinidas (usado quando não há textos exatos)
                  if (matchedText.includes('1 m') || matchedText.includes('mensal') || matchedText.includes('plano 1')) planUrl = r['__CHECKOUT_PLAN_1__'];
                  else if (matchedText.includes('3 m') || matchedText.includes('trimestral') || matchedText.includes('plano 2')) planUrl = r['__CHECKOUT_PLAN_2__'];
                  else if (matchedText.includes('anual') || matchedText.includes('12 m') || matchedText.includes('plano 3') || matchedText.includes('6 m')) planUrl = r['__CHECKOUT_PLAN_3__'];
                }
              }
            }
            forceCheckout(e, planUrl);
          }
        }, { capture: true });

        const origOpen = window.open;
        window.open = function(url, target, features) {
          if (window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'] && typeof url === 'string') {
            // Interceptar apenas URLs que são de plataformas de pagamento conhecidas
            // REMOVIDO: "|| !url.includes(window.location.hostname)" pois era agressivo demais
            // e interceptava navegação interna do quiz (inlead, hotmart, etc.)
            if (url.includes('pay.') || url.includes('checkout') || url.includes('cakto') || url.includes('kirvano') || url.includes('perfectpay') || url.includes('kiwify') || url.includes('lastlink')) {
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
             window.isEditMode = !!e.data.isEditMode;
          }
        });

        document.addEventListener('DOMContentLoaded', () => {
          applyReplacements(document.body);
        });
      </script>
    `;

    // Inserir as variáveis dinâmicas logo após o <head>
    rawHtml = rawHtml.replace(/<head[^>]*>/i, (m) => m + safeGuardV7_1);

    // Inserir scripts adicionais (se houver) de forma segura
    if (themeConfig.head_scripts) {
       rawHtml = rawHtml.replace('</head>', () => `\n<!-- HEAD SCRIPTS -->\n${themeConfig.head_scripts}\n</head>`);
    }
    if (themeConfig.body_scripts) {
       rawHtml = rawHtml.replace('</body>', () => `\n<!-- BODY SCRIPTS -->\n${themeConfig.body_scripts}\n</body>`);
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
