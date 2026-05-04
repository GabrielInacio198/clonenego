import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine v13.0 (SUPER RESTORE)
 * Foco total na visibilidade. Sem proxy, sem reescrita.
 * Garante que o site apareça para o cliente.
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quiz.name || 'Funil'}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; }
    iframe { border: none; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <iframe src="${quiz.original_url}"></iframe>
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
