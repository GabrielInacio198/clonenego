import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine v12.0 — FULL TRANSPARENT PROXY
 * Todas as requisições do cliente são reescritas para o domínio original.
 * O navegador não sabe que está em outro servidor.
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

  const originalUrl = quiz.original_url;
  const baseUrlObj = new URL(originalUrl);
  const baseOrigin = baseUrlObj.origin; // ex: https://inlead.digital
  const replacements = quiz.theme_config?.replacements || {};
  const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';

  try {
    // Buscar o HTML original
    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    if (!response.ok) throw new Error(`Origem retornou ${response.status}`);

    let html = await response.text();

    // =============================================================
    // REESCRITA DE URLs — Faz tudo apontar para o nosso proxy
    // Para que chamadas de API, _next/data, imagens e scripts
    // passem pelo nosso servidor e não sejam bloqueadas por CORS
    // =============================================================
    const proxyBase = `/api/proxy?overrideHost=${encodeURIComponent(baseUrlObj.hostname)}&url=`;

    // Reescrever src e href absolutos do site original
    html = html.replace(
      /(href|src|action)="(https?:\/\/[^"]*?)"/g,
      (match, attr, url) => {
        if (url.startsWith(baseOrigin)) {
          return `${attr}="${proxyBase}${encodeURIComponent(url)}"`;
        }
        return match;
      }
    );

    // Reescrever caminhos relativos que começam com /
    html = html.replace(
      /(href|src|action)="(\/[^"]*?)"/g,
      (match, attr, path) => {
        if (path.startsWith('/api/proxy') || path.startsWith('//')) return match;
        return `${attr}="${proxyBase}${encodeURIComponent(baseOrigin + path)}"`;
      }
    );

    // Reescrever _next/static e _next/data inline em scripts
    html = html.replace(
      /"(\/_next\/[^"]+)"/g,
      (match, path) => `"${proxyBase}${encodeURIComponent(baseOrigin + path)}"`
    );

    // =============================================================
    // INJEÇÃO DE CONTROLE — Checkout e UTMs
    // =============================================================
    const controlScript = `
<script>
(function() {
  var CHECKOUT = ${JSON.stringify(checkoutUrl)};
  var origParams = window.location.search;
  
  // Interceptar XMLHttpRequest para redirecionar chamadas de API
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('/api/proxy')) {
      url = '/api/proxy?overrideHost=${encodeURIComponent(baseUrlObj.hostname)}&url=' + encodeURIComponent('${baseOrigin}' + url);
    }
    return _open.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
  };

  // Interceptar fetch
  var _fetch = window.fetch;
  window.fetch = function(resource) {
    if (typeof resource === 'string' && resource.startsWith('/') && !resource.startsWith('/api/proxy')) {
      resource = '/api/proxy?overrideHost=${encodeURIComponent(baseUrlObj.hostname)}&url=' + encodeURIComponent('${baseOrigin}' + resource);
    }
    return _fetch.apply(this, arguments);
  };

  // Interceptar checkout
  if (CHECKOUT) {
    document.addEventListener('click', function(e) {
      var el = e.target.closest('a, button');
      if (!el) return;
      var href = el.getAttribute('href') || '';
      var text = el.textContent.toLowerCase();
      if (href.includes('pay') || href.includes('checkout') || href.includes('cakto') ||
          href.includes('perfectpay') || href.includes('kirvano') ||
          text.includes('comprar') || text.includes('receber') || text.includes('quero')) {
        e.preventDefault();
        e.stopPropagation();
        window.top.location.href = CHECKOUT + (origParams || '');
      }
    }, true);
  }
})();
</script>
<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>`;

    // Inserir no <head>
    html = html.replace('<head>', '<head>' + controlScript);

    // Registrar visualização de forma assíncrona
    supabaseAdmin.from('quiz_views').insert([{ quiz_id: id }]).then(() => {});

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *",
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });

  } catch (err: any) {
    console.error('[SnapFunnel v12]', err.message);
    return new NextResponse(`Erro: ${err.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
