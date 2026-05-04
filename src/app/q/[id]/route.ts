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
  const userCheckoutUrl = replacements['__CHECKOUT_URL__'] || '';
  const savedHtml = quiz.theme_config?.rawHtml;
  const originalUrl = quiz.original_url;

  try {
    const baseUrlObj = new URL(originalUrl);
    let html = savedHtml || '';

    if (!html) {
      return new NextResponse(`
        <iframe src="${originalUrl}" style="border:none;width:100%;height:100%;position:fixed;top:0;left:0;"></iframe>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    // 🛡️ DNA REPLACEMENT (v19.1)
    if (userCheckoutUrl) {
       html = html.split('__CHECKOUT_URL__').join(userCheckoutUrl);
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
          const CHECKOUT = ${JSON.stringify(userCheckoutUrl)};
          const origParams = window.location.search;
          document.addEventListener('click', function(e) {
            const el = e.target.closest('a, button, [role="button"]');
            if (!el) return;
            const href = el.getAttribute('href') || '';
            const text = el.textContent.toLowerCase();
            if ((href.includes('hotmart') || href.includes('checkout') || href.includes('pay.')) && CHECKOUT) {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = CHECKOUT + (origParams || '');
            }
          }, true);
        })();
      </script>
    `;

    // INJEÇÃO ROBUSTA (Regex garante que funciona mesmo com <HEAD> ou <head class="...">)
    html = html.replace(/<head[^>]*>/i, (match) => match + protection);
    html = html.replace(/<\/body>/i, (match) => controls + match);

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
