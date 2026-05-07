import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy God Mode v7.2 — Ultra-Clean (Zero Interference)
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse(`<h1>Erro site original (${response.status})</h1>`, { status: 502 });
    }

    const rawHtml = await response.text();
    const $ = cheerio.load(rawHtml);
    const baseUrl = new URL(originalUrl).origin;

    // 1. BASE TAG é o que resolve 99% dos casos visuais sem quebrar JS
    $('base').remove();
    $('head').prepend(`<base href="${originalUrl}">`);

    // 2. Script Mínimo para Checkout
    const engineScript = `
      <script>
        (function() {
          const CHECKOUT_URL = '${checkoutUrl}';
          const gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
          
          function patch() {
            if (!CHECKOUT_URL) return;
            document.querySelectorAll('a').forEach(el => {
              const href = (el.getAttribute('href') || '').toLowerCase();
              if (gateways.some(g => href.includes(g))) {
                el.href = CHECKOUT_URL;
                el.addEventListener('click', (e) => {
                   e.preventDefault();
                   const u = new URL(CHECKOUT_URL);
                   const p = new URLSearchParams(window.location.search);
                   ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck'].forEach(k => { if (p.get(k)) u.searchParams.set(k, p.get(k)); });
                   window.location.href = u.toString();
                }, true);
              }
            });
          }
          setInterval(patch, 2000);
          window.addEventListener('load', patch);
        })();
      </script>
    `;
    $('head').append(engineScript);

    if (config.pixel_script) $('body').append(config.pixel_script);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    return new NextResponse($.html(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    return new NextResponse(`Erro: ${error.message}`, { status: 500 });
  }
}
