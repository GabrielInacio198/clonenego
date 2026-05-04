import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine v15.0 — GHOST MIRROR (Final Boss)
 * Estabilidade absoluta: Iframe Seguro + Comunicação de Eventos.
 * Resolve o "piscar" e o erro de redirecionamento do Checkout.
 */
export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  if (!id) return new NextResponse('ID missing', { status: 400 });

  const { data: quiz } = await supabaseAdmin
    .from('quizzes')
    .select('theme_config, name')
    .eq('id', id)
    .single();

  if (!quiz) return new NextResponse('Quiz não encontrado', { status: 404 });

  const replacements = quiz.theme_config?.replacements || {};
  const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';

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
  <iframe id="funnel" src="/api/render/${id}"></iframe>
  
  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  <script>
    (function() {
      const CHECKOUT_FIXO = ${JSON.stringify(checkoutUrl)};
      const origParams = window.location.search;

      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'SNAP_CHECKOUT') {
          console.log("SnapFunnel: Checkout detectado! Redirecionando...");
          // Prioridade para o checkout fixo do painel, senao usa o do botao
          const finalUrl = CHECKOUT_FIXO || e.data.url;
          if (finalUrl) {
            window.top.location.href = finalUrl + (finalUrl.includes('?') ? '&' : '?') + origParams.replace('?', '');
          }
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
