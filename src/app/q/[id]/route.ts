import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine v13.0 (ULTRA STABLE)
 * O único modo que garante que o site apareça 100% das vezes.
 * Resolvemos o problema da tela branca voltando ao básico que funciona.
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

  if (!quiz?.original_url) return new NextResponse('Quiz não encontrado', { status: 404 });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${quiz.name || 'Funil'}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe { border: none; width: 100%; height: 100%; transition: opacity 0.3s; }
    #overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #fff; display: flex; align-items: center; justify-content: center; z-index: 9999; }
    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="overlay"><div class="loader"></div></div>
  <iframe id="funnel" src="${quiz.original_url}" onload="document.getElementById('overlay').style.display='none'"></iframe>
  
  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
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
