import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine v13.0 — DIRECT ULTRA MIRROR
 * Carrega o site original diretamente via Iframe SEM PROXY.
 * Isso ignora todos os bloqueios de servidor e Erros 500.
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
  <iframe id="funnel" src="${quiz.original_url}"></iframe>
  
  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  <script>
    (function() {
      const CHECKOUT = ${JSON.stringify(checkoutUrl)};
      
      // Monitorar cliques no iframe (via mensagem se possível ou via detecção de foco)
      window.focus();
      window.addEventListener('blur', function() {
        // Se o usuário clicou no iframe, tentamos agir
        setTimeout(() => {
          if (document.activeElement.tagName === 'IFRAME' && CHECKOUT) {
             console.log("Clique detectado no Funil");
             // Nota: Não conseguimos forçar o redirect aqui por segurança de cross-origin,
             // a menos que o site original permita. Mas o carregamento visual está garantido.
          }
        }, 100);
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
