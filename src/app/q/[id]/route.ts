import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine v8.6
 *
 * Ordem de prioridade:
 * 1. rawHtml com conteúdo real → serve direto (editor tem DOM access, checkout funciona)
 * 2. rawHtml é casca CSR vazia → tenta live fetch do original_url
 * 3. Live fetch tem conteúdo → serve direto
 * 4. Tudo falhou (Cloudflare bloqueou, CSR puro) → iframe direto
 */

/** Retorna true se o HTML tem corpo com conteúdo real (não é casca React/Vue vazia). */
function hasRealContent(html: string): boolean {
  if (!html || html.length < 300) return false;
  // Rejeitar páginas de desafio Cloudflare
  if (html.includes('cf-browser-verification') || html.includes('challenge-form') || html.includes('cf_clearance')) return false;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return false;
  const text = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return text.length > 150;
}

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  try {
    if (!id) throw new Error('ID ausente');

    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !quiz) throw new Error('Quiz não encontrado');

    const themeConfig = quiz.theme_config || {};
    const replacements: Record<string, string> = themeConfig.replacements || {};
    const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';
    const baseUrl = new URL(quiz.original_url).origin;

    let html = themeConfig.rawHtml || '';

    // Se rawHtml não tem conteúdo real, tenta live fetch
    if (!hasRealContent(html)) {
      try {
        const res = await fetch(quiz.original_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
        });
        if (res.ok) {
          const fetched = await res.text();
          if (hasRealContent(fetched)) html = fetched;
        }
      } catch (_) {
        // live fetch falhou — vai para iframe
      }
    }

    // Se ainda sem conteúdo real (Cloudflare, CSR puro, etc.) → iframe
    if (!hasRealContent(html)) {
      return iframeFallback(quiz);
    }

    // ── Temos HTML com conteúdo: processar e servir ──────────────────────────

    // 1. Aplicar substituições de texto do editor
    for (const [key, value] of Object.entries(replacements)) {
      if (key && !key.startsWith('__STYLE__::') && value) {
        html = html.split(key).join(value);
      }
    }

    // 2. Corrigir caminhos relativos → absolutos (essencial para CSR que passa no fetch)
    html = html.split('src="/').join(`src="${baseUrl}/`);
    html = html.split('href="/').join(`href="${baseUrl}/`);

    // 3. Injetar interceptador de checkout + UTM
    const checkoutScript = `<script>
(function(){
  var C=${JSON.stringify(checkoutUrl)};
  document.addEventListener('click',function(e){
    var t=e.target.closest('a,button,[role="button"]');
    if(!t||!C)return;
    var h=t.getAttribute('href')||'';
    var tx=(t.textContent||'').toLowerCase();
    var isCheckout=h==='__CHECKOUT_URL__'||
      h.includes('pay.')||h.includes('checkout')||
      h.includes('hotmart')||h.includes('perfectpay')||
      h.includes('cakto')||h.includes('kiwify')||
      h.includes('monetizze')||h.includes('doppus')||
      tx.includes('comprar')||tx.includes('quero acesso')||tx.includes('garantir');
    if(isCheckout){
      e.preventDefault();e.stopPropagation();
      try{var u=new URL(C);new URLSearchParams(window.location.search).forEach(function(v,k){u.searchParams.set(k,v)});window.location.href=u.toString();}
      catch(ex){window.location.href=C;}
    }
  },true);
})();
</script>
<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>`;

    html = html.replace('</head>', checkoutScript + '</head>');
    if (themeConfig.head_scripts) html = html.replace('</head>', themeConfig.head_scripts + '</head>');
    if (themeConfig.body_scripts) html = html.replace('</body>', themeConfig.body_scripts + '</body>');

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy': 'frame-ancestors *',
      },
    });

  } catch (err: any) {
    return new NextResponse(`Erro: ${err.message}`, { status: 500 });
  }
}

/** Fallback: iframe direto para sites que bloqueiam fetch server-side. */
function iframeFallback(quiz: any): NextResponse {
  const name = (quiz.name || 'Funil').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const src = quiz.original_url;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff;}
    iframe{border:none;width:100%;height:100%;position:fixed;top:0;left:0;}
    #sf-loader{position:fixed;inset:0;z-index:9999;background:#fff;display:flex;align-items:center;justify-content:center;transition:opacity 0.4s;}
    #sf-loader.out{opacity:0;pointer-events:none;}
    .sf-spin{width:36px;height:36px;border:3px solid #e0e0e0;border-top-color:#888;border-radius:50%;animation:spin .75s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}
    #sf-eo{position:fixed;inset:0;z-index:10000;display:none;pointer-events:none;cursor:crosshair;background:rgba(59,130,246,0.04);border:2px dashed rgba(59,130,246,0.35);box-sizing:border-box;}
  </style>
</head>
<body>
  <div id="sf-loader"><div class="sf-spin"></div></div>
  <iframe id="sf-frame" src="${src}" allow="clipboard-read;clipboard-write;payment"></iframe>
  <div id="sf-eo"></div>
  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  <script>
  (function(){
    var L=document.getElementById('sf-loader'),F=document.getElementById('sf-frame'),E=document.getElementById('sf-eo'),T=null;
    function hide(){L.classList.add('out');setTimeout(function(){L.style.display='none';},450);}
    F.addEventListener('load',function(){clearTimeout(T);T=setTimeout(hide,3000);});
    setTimeout(hide,20000);
    window.addEventListener('message',function(e){
      if(!e.data||e.data.type!=='SET_MODE')return;
      var on=!!e.data.isEditMode;
      E.style.display=on?'block':'none';E.style.pointerEvents=on?'all':'none';
    });
    E.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      window.parent.postMessage({type:'IFRAME_CLICK',x:e.clientX,y:e.clientY},'*');
    });
  })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
