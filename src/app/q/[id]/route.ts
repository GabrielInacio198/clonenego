import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_req: Request, context: any) {
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

  const title = (quiz.name || 'Funil').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; overflow: hidden; }
    #funnel-wrap { position: fixed; inset: 0; }
    #funnel {
      border: none; width: 100%; height: 100%;
      opacity: 0;
      transition: opacity 0.35s ease;
    }
    #funnel.ready { opacity: 1; }
    #loader {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: #fff; z-index: 10;
      transition: opacity 0.35s ease;
    }
    #loader.hidden { opacity: 0; pointer-events: none; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #eee;
      border-top-color: #555;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loader"><div class="spinner"></div></div>
  <div id="funnel-wrap">
    <iframe
      id="funnel"
      src="/q/${id}/frame"
      allow="autoplay; fullscreen"
    ></iframe>
  </div>

  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  <script>
  (function() {
    var iframe = document.getElementById('funnel');
    var loader = document.getElementById('loader');

    // Show funnel, hide loader once iframe content loaded
    iframe.addEventListener('load', function() {
      iframe.classList.add('ready');
      loader.classList.add('hidden');
    });

    // Clean URL on custom domain (wrapper is plain HTML, no Next.js router — safe)
    var h = window.location.hostname;
    var isCustom = !h.includes('vercel.app') && !h.includes('localhost');
    if (isCustom) {
      try { window.history.replaceState(null, '', '/' + window.location.search); } catch(_) {}
    }

    // Relay postMessages from frame to editor and intercept SF_CHECKOUT
    window.addEventListener('message', function(e) {
      // Checkout redirect from the frame content
      if (e.data && e.data.type === 'SF_CHECKOUT' && e.data.url) {
        window.location.href = e.data.url;
        return;
      }
      // Forward SYNC_REPLACEMENTS from editor down into the frame
      if (e.data && e.data.type === 'SYNC_REPLACEMENTS') {
        var fw = iframe.contentWindow;
        if (fw) fw.postMessage(e.data, '*');
        return;
      }
      // Forward EDIT_ELEMENT events from frame up to editor parent
      if (e.data && e.data.type === 'EDIT_ELEMENT') {
        if (window.parent !== window) window.parent.postMessage(e.data, '*');
      }
    });
  })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': 'frame-ancestors *;',
      'X-Frame-Options': 'ALLOWALL',
      'Cache-Control': 'no-store',
    },
  });
}
