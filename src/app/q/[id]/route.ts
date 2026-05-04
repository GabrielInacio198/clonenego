import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  if (!id) return new NextResponse('ID missing', { status: 400 });

  const { data: quiz } = await supabaseAdmin
    .from('quizzes')
    .select('theme_config, original_url, name')
    .eq('id', id)
    .single();

  if (!quiz) return new NextResponse('Quiz não encontrado', { status: 404 });

  const replacements = quiz.theme_config?.replacements || {};
  const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';
  const savedHtml = quiz.theme_config?.rawHtml;
  const originalUrl = quiz.original_url;

  if (!savedHtml) {
    return new NextResponse(`
      <style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style>
      <iframe src="${originalUrl}" style="border:none;width:100%;height:100%;"></iframe>
    `, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const baseUrlObj = new URL(originalUrl);
    let html = savedHtml;

    // 🛡️ REESCRITA AGRESSIVA NO SERVIDOR (Pre-emptive Strike)
    // Se tivermos o link de checkout, já trocamos qualquer menção a hotmart/checkout no HTML bruto
    if (checkoutUrl) {
       // Procura por links de checkouts comuns e troca pelo do usuário
       html = html.replace(/https?:\/\/[^"']*(hotmart|perfectpay|cakto|checkout|pay\.)[^"']*/gi, checkoutUrl);
    }

    const protection = `
      <base href="${baseUrlObj.origin}/">
      <script>
        try {
          Object.defineProperty(window.location, 'hostname', { get: () => "${baseUrlObj.hostname}" });
          Object.defineProperty(window.location, 'host', { get: () => "${baseUrlObj.host}" });
        } catch(e) {}
      </script>
    `;

    const controls = `
      <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
      <script>
        (function() {
          const CHECKOUT = ${JSON.stringify(checkoutUrl)};
          const origParams = window.location.search;

          // Interceptação de Clique v18.1 (Incluindo Hotmart)
          document.addEventListener('click', function(e) {
            const el = e.target.closest('a, button, [role="button"]');
            if (!el) return;
            
            const href = el.getAttribute('href') || '';
            const text = el.textContent.toLowerCase();
            
            const isCheckout = href.includes('pay') || href.includes('checkout') || 
                               href.includes('hotmart') || href.includes('cakto') || 
                               href.includes('perfectpay') || text.includes('comprar') || 
                               text.includes('receber') || text.includes('quero') || 
                               text.includes('obter') || text.includes('acesso');

            if (isCheckout && CHECKOUT) {
              e.preventDefault();
              e.stopPropagation();
              console.log("SnapFunnel: Checkout Detectado (Hotmart/etc). Redirecionando...");
              window.location.href = CHECKOUT + (origParams || '');
            }
          }, true);
        })();
      </script>
    `;

    html = html.replace('<head>', '<head>' + protection);
    html = html.replace('</body>', controls + '</body>');

    supabaseAdmin.from('quiz_views').insert([{ quiz_id: id }]).then(() => {});

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL'
      }
    });

  } catch (err) {
    return new NextResponse(`
      <iframe src="${originalUrl}" style="border:none;width:100%;height:100%;position:fixed;top:0;left:0;"></iframe>
    `, { headers: { 'Content-Type': 'text/html' } });
  }
}
