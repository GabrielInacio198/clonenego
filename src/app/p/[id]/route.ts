import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Serve uma página clonada pelo ID.
 * Injeta pixel de rastreamento e scripts de checkout se configurados.
 * NÃO interfere com o sistema de quiz/funis (/q/[id]).
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

    if (error || !page) {
      return new NextResponse('<h1>Página não encontrada</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    let html = page.html_content || '';
    const config = page.config || {};

    // Injetar pixel de rastreamento
    if (config.pixel_script) {
      html = html.replace('</head>', `${config.pixel_script}\n</head>`);
    }

    // Injetar head_scripts (customizados)
    if (config.head_scripts) {
      html = html.replace('</head>', `${config.head_scripts}\n</head>`);
    }

    // Injetar body_scripts
    if (config.body_scripts) {
      html = html.replace('</body>', `${config.body_scripts}\n</body>`);
    }

    // Interceptação de checkout
    if (config.checkout_url) {
      const checkoutScript = `
<script>
(function() {
  const CHECKOUT_URL = '${config.checkout_url}';
  
  // Capturar UTMs da URL atual
  const currentParams = new URLSearchParams(window.location.search);
  const utmParams = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'].forEach(function(p) {
    if (currentParams.get(p)) utmParams[p] = currentParams.get(p);
  });

  function buildCheckoutUrl() {
    const url = new URL(CHECKOUT_URL);
    Object.entries(utmParams).forEach(function([k, v]) {
      url.searchParams.set(k, v);
    });
    return url.toString();
  }

  // Interceptar links de checkout
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href') || '';
    if (
      href.includes('checkout') || href.includes('pay') || href.includes('comprar') ||
      href.includes('hotmart') || href.includes('eduzz') || href.includes('monetizze') ||
      href.includes('kiwify') || href.includes('braip') ||
      link.dataset.checkout
    ) {
      e.preventDefault();
      window.location.href = buildCheckoutUrl();
    }
  }, true);

  // Interceptar botões de compra
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const text = (btn.textContent || '').toLowerCase();
    if (
      text.includes('comprar') || text.includes('adquirir') || text.includes('garantir') ||
      text.includes('quero') || text.includes('buy') || text.includes('checkout') ||
      btn.dataset.checkout
    ) {
      e.preventDefault();
      window.location.href = buildCheckoutUrl();
    }
  }, true);
})();
</script>`;
      html = html.replace('</body>', `${checkoutScript}\n</body>`);
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });

  } catch (error: any) {
    console.error('Page serve error:', error);
    return new NextResponse('<h1>Erro interno</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
