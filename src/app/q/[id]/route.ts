import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Engine — God Mode v7 (RESTAURADO)
 *
 * MODO 1 (rawHtml disponível): serve HTML processado diretamente.
 *   - Assets reescritos via /api/proxy (feito no clone)
 *   - Substituições de texto aplicadas (incluindo __CHECKOUT_URL__)
 *   - Editor tem acesso direto ao DOM (same-origin) → edição funciona
 *
 * MODO 2 (sem rawHtml): fallback iframe direto para sites protegidos por
 *   Cloudflare que bloqueiam fetch server-side (ex: inlead.digital).
 *   - Editor funciona via overlay de captura de cliques
 */
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
  const replacements: Record<string, string> = themeConfig.replacements || {};
  const checkoutUrl = replacements['__CHECKOUT_URL__'] || '';
  let rawHtml: string = themeConfig.rawHtml || '';

  // ─── MODO 1: rawHtml disponível — serve diretamente ──────────────────────
  if (rawHtml) {
    // 1. Aplicar todas as substituições de texto
    for (const [key, value] of Object.entries(replacements)) {
      if (key && !key.startsWith('__STYLE__::') && value) {
        rawHtml = rawHtml.split(key).join(value);
      }
    }

    // 2. Interceptador de checkout (backup para links ainda originais)
    const checkoutScript = checkoutUrl ? `<script>
(function(){
  var CHECKOUT=${JSON.stringify(checkoutUrl)};
  document.addEventListener('click',function(e){
    var t=e.target.closest('a,button,[role="button"]');
    if(!t)return;
    var h=t.getAttribute('href')||'';
    if(h==='__CHECKOUT_URL__'||h.includes('hotmart')||h.includes('perfectpay')||h.includes('cakto')||h.includes('kiwify')||h.includes('pay.')){
      e.preventDefault();e.stopPropagation();
      try{var u=new URL(CHECKOUT);new URLSearchParams(window.location.search).forEach(function(v,k){u.searchParams.set(k,v)});window.location.href=u.toString();}
      catch(ex){window.location.href=CHECKOUT;}
    }
  },true);
})();
</script>` : '';

    const utmScript = `<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>`;

    rawHtml = rawHtml.replace('</head>', checkoutScript + utmScript + '</head>');
    if (themeConfig.head_scripts) rawHtml = rawHtml.replace('</head>', themeConfig.head_scripts + '</head>');
    if (themeConfig.body_scripts) rawHtml = rawHtml.replace('</body>', themeConfig.body_scripts + '</body>');

    return new NextResponse(rawHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // ─── MODO 2: sem rawHtml — iframe direto (sites Cloudflare / inlead.digital) ─
  const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quiz.name || 'Funil'}</title>
  <style>
    body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff;}
    iframe{border:none;width:100%;height:100%;position:fixed;top:0;left:0;}
    #sf-loader{position:fixed;inset:0;z-index:9999;background:#fff;display:flex;align-items:center;justify-content:center;transition:opacity 0.4s;}
    #sf-loader.out{opacity:0;pointer-events:none;}
    .sf-spin{width:36px;height:36px;border:3px solid #e0e0e0;border-top-color:#888;border-radius:50%;animation:spin .75s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}
    #sf-edit-overlay{position:fixed;inset:0;z-index:10000;display:none;pointer-events:none;cursor:crosshair;background:rgba(59,130,246,0.04);border:2px dashed rgba(59,130,246,0.35);box-sizing:border-box;}
  </style>
</head>
<body>
  <div id="sf-loader"><div class="sf-spin"></div></div>
  <iframe id="sf-frame" src="${quiz.original_url}" allow="clipboard-read;clipboard-write;payment"></iframe>
  <div id="sf-edit-overlay"></div>
  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
  <script>
  (function(){
    var loader=document.getElementById('sf-loader');
    var frame=document.getElementById('sf-frame');
    var editOverlay=document.getElementById('sf-edit-overlay');
    var t=null;
    function hide(){loader.classList.add('out');setTimeout(function(){loader.style.display='none';},450);}
    frame.addEventListener('load',function(){clearTimeout(t);t=setTimeout(hide,3000);});
    setTimeout(hide,20000);
    window.addEventListener('message',function(e){
      if(!e.data||e.data.type!=='SET_MODE')return;
      var on=!!e.data.isEditMode;
      editOverlay.style.display=on?'block':'none';
      editOverlay.style.pointerEvents=on?'all':'none';
    });
    editOverlay.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      window.parent.postMessage({type:'IFRAME_CLICK',x:e.clientX,y:e.clientY},'*');
    });
  })();
  </script>
</body>
</html>`;

  return new NextResponse(fallbackHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
