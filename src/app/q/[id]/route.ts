import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  if (!id) return new NextResponse('ID missing', { status: 400 });

  const { data: quiz } = await supabaseAdmin
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single();

  if (!quiz) return new NextResponse('Quiz não encontrado', { status: 404 });

  const originalUrl = quiz.original_url;
  const themeConfig = quiz.theme_config || {};
  const replacements = themeConfig.replacements || {};

  try {
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = baseUrlObj.origin;

    const response = await fetch(originalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    let html = await response.text();
    
    // 🛡️ INJEÇÃO ATÔMICA v7.2 (Antes de tudo, até do <head>)
    const atomicProtection = `
<script>
  (function() {
    // 1. Congelar o Histórico (Impede a tela branca de SecurityError)
    const noop = () => {};
    Object.defineProperty(window.history, 'pushState', { value: noop, writable: false });
    Object.defineProperty(window.history, 'replaceState', { value: noop, writable: false });

    // 2. Travar a Localização (Impede o site de fugir/redirecionar)
    try {
      const mask = {
        get hostname() { return "${baseUrlObj.hostname}"; },
        get host() { return "${baseUrlObj.host}"; },
        get origin() { return "${baseUrlObj.origin}"; },
        get href() { return window.location.href; }
      };
      // Não podemos travar o window.location diretamente, mas enganamos o acesso via script
      window.__location = mask;
    } catch(e) {}

    // 3. Interceptar navegação forçada
    window.onbeforeunload = function() {
       console.log("SnapFunnel: Bloqueando tentativa de fuga da página.");
       return "Você tem certeza?"; 
    };
  })();
</script>
`;

    // Injetar no topo absoluto do HTML
    html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>' + atomicProtection);
    if (!html.includes(atomicProtection)) {
      html = atomicProtection + html;
    }

    const $ = cheerio.load(html);

    // Configurações Adicionais God Mode
    $('head').prepend(`<base href="${baseUrl}/">`);
    $('head').append(`<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>`);
    
    // Script de Checkout
    const checkoutScript = `
      <script>
        window.QUIZ_REPLACEMENTS = ${JSON.stringify(replacements)};
        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"]');
          if (!target) return;
          const href = target.getAttribute('href') || '';
          const checkoutUrl = window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'];
          if ((href.includes('hotmart') || href.includes('checkout') || href.includes('pay.')) && checkoutUrl) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = checkoutUrl + window.location.search;
          }
        }, true);
      </script>
    `;
    $('body').append(checkoutScript);

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL'
      },
    });

  } catch (err: any) {
    return new NextResponse(`<iframe src="${originalUrl}" style="border:none;width:100%;height:100%;"></iframe>`, { headers: { 'Content-Type': 'text/html' } });
  }
}
