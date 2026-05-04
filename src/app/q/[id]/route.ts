import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine v13.0 (SUPER RESTORE)
 * Foco total na visibilidade. Sem proxy, sem reescrita.
 * Garante que o site apareça para o cliente.
 */
export async function GET(_req: Request, context: any) {
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
    iframe { border: none; width: 100%; height: 100%; display: block; }

    /* Anti-flicker overlay — cobre o iframe enquanto o React do site original carrega */
    #sf-loader {
      position: fixed; inset: 0; z-index: 9999;
      background: #fff;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.4s ease;
    }
    #sf-loader.fade-out { opacity: 0; pointer-events: none; }
    .sf-spinner {
      width: 36px; height: 36px;
      border: 3px solid #e0e0e0;
      border-top-color: #888;
      border-radius: 50%;
      animation: sf-spin 0.75s linear infinite;
    }
    @keyframes sf-spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <!-- Overlay cobre o flash branco inicial do CSR -->
  <div id="sf-loader"><div class="sf-spinner"></div></div>

  <iframe id="sf-frame" src="${quiz.original_url}"></iframe>

  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  <script>
    (function () {
      var loader = document.getElementById('sf-loader');
      var frame  = document.getElementById('sf-frame');
      var hideTimer = null;
      var loadCount = 0;

      function show() {
        clearTimeout(hideTimer);
        loader.style.display = 'flex';
        // Força reflow para o fade funcionar corretamente após display:flex
        loader.offsetHeight;
        loader.style.opacity = '1';
        loader.classList.remove('fade-out');
      }

      function hide() {
        loader.classList.add('fade-out');
        setTimeout(function () { loader.style.display = 'none'; }, 450);
      }

      // Re-ativa o overlay a CADA onload do iframe.
      // O quiz navega entre etapas como páginas separadas (URLs diferentes),
      // então cada passo dispara um novo onload → flash. Ao reativar o overlay
      // em cada evento cobrimos todos os flashes, não só o inicial.
      // Primeira carga: 2.5 s (sem cache). Cargas seguintes: 1.2 s (cache quente).
      frame.addEventListener('load', function () {
        loadCount++;
        show();
        var delay = loadCount === 1 ? 2500 : 1200;
        hideTimer = setTimeout(hide, delay);
      });

      // Fallback de segurança
      setTimeout(hide, 15000);
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
