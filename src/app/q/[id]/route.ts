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
  const replacements = themeConfig.replacements || {};
  const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${quiz.name || 'SnapFunnel'}</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; }
        iframe { border: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        #loading-overlay { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: #fff; display: flex; align-items: center; justify-content: center; z-index: 9999;
            transition: opacity 0.5s;
        }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="loading-overlay"><div class="spinner"></div></div>
    <iframe id="funnel-iframe" src="${quiz.original_url}" allow="clipboard-read; clipboard-write; payment"></iframe>

    <script>
        const iframe = document.getElementById('funnel-iframe');
        const overlay = document.getElementById('loading-overlay');
        const CHECKOUT = "${checkoutUrl}";

        // Esconder o loading quando o site abrir
        iframe.onload = () => {
            setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.style.display = 'none', 500); }, 1500);
        };

        // RASTREADOR DE CLIQUE (O Segredo do v25.0)
        // Como o iframe é cross-origin, não podemos ler o conteúdo, 
        // MAS podemos detectar o "foco" quando o usuário clica nele!
        let monitor = setInterval(() => {
            if (document.activeElement === iframe) {
                console.log("SnapFunnel: Clique detectado no Iframe!");
                // Se o clique foi numa área de checkout (estimado por tempo/clique), poderíamos agir.
                // Mas a solução real é o Iframe Same-Origin que vamos tentar se este falhar.
                document.activeElement.blur();
            }
        }, 500);
    </script>
    <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL'
    }
  });
}
