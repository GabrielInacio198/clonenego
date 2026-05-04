import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  if (!id) return new NextResponse('ID missing', { status: 400 });

  // 1. Pegar os dados do banco (Onde o DNA já está salvo)
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

  // Se não tiver HTML salvo (clones muito novos ou antigos sem rawHtml), usa o fallback de iframe
  if (!html) {
    return new NextResponse(`
      <iframe src="${quiz.original_url}" style="border:none;width:100%;height:100%;position:fixed;top:0;left:0;"></iframe>
      <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
    `, { headers: { 'Content-Type': 'text/html' } });
  }

  // 2. Injetar o link de checkout do usuário dinamicamente
  const finalInjection = `
    <script>
      window.__USER_CHECKOUT__ = "${checkoutUrl}";
    </script>
    <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  `;

  // Colocamos o link de checkout e os scripts no final do head ou início do body
  html = html.replace('</head>', finalInjection + '</head>');

  // Injetar scripts personalizados de head/body se existirem
  if (themeConfig.head_scripts) html = html.replace('</head>', themeConfig.head_scripts + '</head>');
  if (themeConfig.body_scripts) html = html.replace('</body>', themeConfig.body_scripts + '</body>');

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL'
    },
  });
}
