import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

  const themeConfig = quiz.theme_config || {};
  let html = themeConfig.rawHtml || '';
  const replacements = themeConfig.replacements || {};
  const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';

  if (!html) {
    return new NextResponse(`<iframe src="${quiz.original_url}" style="border:none;width:100%;height:100%;"></iframe>`, { headers: { 'Content-Type': 'text/html' } });
  }

  // 🛡️ INJEÇÃO DINÂMICA DE CHECKOUT (God Mode v7)
  const dynamicInjection = `
    <script>
      (function() {
        window.__USER_CHECKOUT__ = "${checkoutUrl}";
        
        document.addEventListener('click', (e) => {
          const t = e.target.closest('a, button, [role="button"]');
          if (!t) return;
          const h = t.getAttribute('href') || '';
          const c = window.__USER_CHECKOUT__;
          if (c && (h.includes('checkout') || h.includes('pay.') || h.includes('hotmart') || h.includes('cakto'))) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = c + window.location.search;
          }
        }, true);
      })();
    </script>
    <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  `;

  html = html.replace('</head>', dynamicInjection + '</head>');

  if (themeConfig.head_scripts) html = html.replace('</head>', themeConfig.head_scripts + '</head>');
  if (themeConfig.body_scripts) html = html.replace('</body>', themeConfig.body_scripts + '</body>');

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL'
    },
  });
}
