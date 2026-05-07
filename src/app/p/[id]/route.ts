import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode v7.3 — Ultimate Balance
 * 
 * Combina estabilidade total com suporte a SPAs e sub-rotas.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar página com fallback para sub-rotas de SPA (ex: /p/resultado)
    let { data: page, error: dbError } = await supabaseAdmin
      .from('cloned_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (dbError || !page) {
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

    // 2. Fetch do HTML Original com tratamento de buffer (mais estável)
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
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = baseUrlObj.origin;
    const targetHost = baseUrlObj.host;
    const currentOrigin = req.nextUrl.origin;
    const originalPathname = req.nextUrl.pathname;

    // 3. BASE TAG e Engine Scripts
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    const engineScript = `
      <script id="snapfunnel-engine-v7">
        (function() {
          const CHECKOUT_URL = '${checkoutUrl}';
          const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper', 'lowify', 'ironpay'];
          
          // Trava de Histórico para evitar loop e tela preta
          const _path = "${originalPathname}";
          const _push = history.pushState;
          const _repl = history.replaceState;
          history.pushState = function(s, t, u) {
              if (u && u.startsWith('/') && !u.startsWith('/p/')) u = _path + u;
              return _push.apply(this, [s, t, u]);
          };
          history.replaceState = function(s, t, u) {
              if (u && u.startsWith('/') && !u.startsWith('/p/')) u = _path + u;
              return _repl.apply(this, [s, t, u]);
          };

          function patch() {
            document.querySelectorAll('a').forEach(el => {
              const href = (el.getAttribute('href') || '').toLowerCase();
              if (CHECKOUT_URL && (gateways.some(g => href.includes(g)) || el.dataset.checkout)) {
                el.href = CHECKOUT_URL;
                el.onclick = function(e) {
                  e.preventDefault();
                  const target = new URL(CHECKOUT_URL);
                  const p = new URLSearchParams(window.location.search);
                  p.forEach((v, k) => target.searchParams.set(k, v));
                  window.location.href = target.toString();
                };
              }
            });
          }
          setInterval(patch, 2000);
          window.addEventListener('load', patch);
        })();
      </script>
    `;
    $('head').prepend(engineScript);

    // 4. REESCRITA DE ASSETS (O que faltou na versão anterior para tirar a tela preta)
    $('[src], [href]').each((_, el) => {
      const tag = $(el).prop('tagName');
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr) || '';
      
      if (!val || val.startsWith('data:') || val.startsWith('javascript:') || val.startsWith('#')) return;

      const isScriptOrStyle = tag === 'SCRIPT' || (tag === 'LINK' && $(el).attr('rel') === 'stylesheet');

      if (isScriptOrStyle) {
        const absoluteVal = val.startsWith('/') ? baseUrl + val : (val.startsWith('http') ? val : baseUrl + '/' + val);
        const proxied = `${currentOrigin}/api/proxy?url=${encodeURIComponent(absoluteVal)}&overrideHost=${targetHost}`;
        $(el).attr(attr, proxied);
        $(el).removeAttr('integrity').removeAttr('crossorigin');
      }
    });

    if (config.pixel_script) $('body').append(config.pixel_script);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    return new NextResponse($.html(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    return new NextResponse(`Erro fatal: ${error.message}`, { status: 500 });
  }
}
