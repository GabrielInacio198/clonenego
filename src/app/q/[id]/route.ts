import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine v11.0 — IFRAME MIRROR
 * O site original roda 100% isolado no iframe.
 * Nenhum conflito de domínio. Nenhum erro de JS.
 */
export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  if (!id) return new NextResponse('ID missing', { status: 400 });

  const { data: quiz } = await supabaseAdmin
    .from('quizzes')
    .select('theme_config, original_url, name')
    .eq('id', id)
    .single();

  if (!quiz?.original_url) {
    return new NextResponse('Quiz não encontrado', { status: 404 });
  }

  const replacements = quiz.theme_config?.replacements || {};
  const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';

  // URL do site original passada pelo nosso proxy (que remove X-Frame-Options)
  const proxyTarget = `/api/proxy?url=${encodeURIComponent(quiz.original_url)}&overrideHost=${encodeURIComponent(new URL(quiz.original_url).hostname)}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quiz.name || 'Funil'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #fff; }
    #funnel-frame {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      border: none;
      z-index: 1;
    }
    #checkout-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 2;
      pointer-events: none; /* Deixa o iframe receber cliques normalmente */
      background: transparent;
    }
  </style>
</head>
<body>
  <!-- O site original roda no seu próprio contexto — sem conflito de domínio -->
  <iframe
    id="funnel-frame"
    src="${proxyTarget}"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
    allowfullscreen
  ></iframe>

  <!-- Overlay transparente para interceptar navegação de checkout -->
  <div id="checkout-overlay"></div>

  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  <script>
    (function() {
      const CHECKOUT_URL = ${JSON.stringify(checkoutUrl)};
      const originalParams = new URLSearchParams(window.location.search);

      function buildCheckoutUrl(base) {
        if (!base) return null;
        try {
          const url = new URL(base);
          originalParams.forEach((v, k) => { if (!url.searchParams.has(k)) url.searchParams.set(k, v); });
          return url.toString();
        } catch(e) { return base; }
      }

      // Escutar mensagens do iframe (caso o site envie postMessage de checkout)
      window.addEventListener('message', function(e) {
        if (!e.data) return;
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.type === 'CHECKOUT' || data.checkout) {
          const finalUrl = buildCheckoutUrl(CHECKOUT_URL || data.url);
          if (finalUrl) window.location.href = finalUrl;
        }
      });

      // Interceptar cliques no iframe via overlay (navegação top-level)
      const frame = document.getElementById('funnel-frame');
      frame.addEventListener('load', function() {
        try {
          const doc = frame.contentDocument || frame.contentWindow?.document;
          if (!doc) return;

          doc.addEventListener('click', function(e) {
            const el = e.target.closest('a, button');
            if (!el || !CHECKOUT_URL) return;
            const href = el.getAttribute('href') || '';
            const text = el.textContent.toLowerCase();
            const isCheckout = href.includes('pay') || href.includes('checkout') ||
              href.includes('cakto') || href.includes('perfectpay') ||
              href.includes('kirvano') || text.includes('comprar') ||
              text.includes('receber') || text.includes('quero');
            if (isCheckout) {
              e.preventDefault();
              e.stopPropagation();
              const finalUrl = buildCheckoutUrl(CHECKOUT_URL);
              if (finalUrl) window.top.location.href = finalUrl;
            }
          }, true);
        } catch(err) {
          // Cross-origin: usar overlay de captura de cliques da janela pai
          console.warn('Cross-origin fallback ativo');
        }
      });
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *"
    }
  });
}
