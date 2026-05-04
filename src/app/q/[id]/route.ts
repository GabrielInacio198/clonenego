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

    <!-- Overlay para modo de edição do editor (bloqueia navegação do iframe) -->
    <div id="sf-edit-overlay" style="position:fixed;inset:0;z-index:10000;display:none;pointer-events:none;cursor:crosshair;background:rgba(59,130,246,0.04);border:2px dashed rgba(59,130,246,0.35);box-sizing:border-box;"></div>

    <script>
        const iframe = document.getElementById('funnel-iframe');
        const overlay = document.getElementById('loading-overlay');
        const editOverlay = document.getElementById('sf-edit-overlay');
        const CHECKOUT = "${checkoutUrl}";

        // Esconder o loading quando o site abrir — debounce 3s para cobrir Cloudflare challenge
        let hideTimer = null;
        function hideLoading() {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
        }
        iframe.addEventListener('load', () => {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(hideLoading, 3000);
        });
        setTimeout(hideLoading, 20000); // hard fallback

        // Edit mode: recebe SET_MODE do editor pai e ativa/desativa overlay de captura
        window.addEventListener('message', function(e) {
            if (!e.data || e.data.type !== 'SET_MODE') return;
            var active = !!e.data.isEditMode;
            editOverlay.style.display = active ? 'block' : 'none';
            editOverlay.style.pointerEvents = active ? 'all' : 'none';
        });

        // Quando o overlay é clicado, avisa o editor (bloqueia navegação do iframe)
        editOverlay.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.parent.postMessage({ type: 'IFRAME_CLICK', x: e.clientX, y: e.clientY }, '*');
        });
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
