import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const { data: quiz } = await supabaseAdmin
    .from('quizzes')
    .select('theme_config, original_url')
    .eq('id', params.id)
    .single();

  if (!quiz?.original_url) {
    return new NextResponse('Quiz não encontrado', { status: 404 });
  }

  const replacements = quiz.theme_config?.replacements || {};
  const checkoutUrl =
    replacements['__CHECKOUT_URL__'] ||
    replacements['__CHECKOUT_PLAN_1__'] ||
    '';

  try {
    const response = await fetch(quiz.original_url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
    const $ = cheerio.load(html);
    const baseUrlObj = new URL(quiz.original_url);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;

    // Patch __NEXT_DATA__ so URL /q/{id}/frame matches stored asPath + query.all.
    // For /[...all] page at URL /q/{id}/frame → expected all=['q',id,'frame'].
    // When stored values match the actual URL, Next.js skips the mismatch
    // navigation that causes blank pages.
    const nextDataEl = $('script#__NEXT_DATA__');
    if (nextDataEl.length > 0) {
      try {
        const nd = JSON.parse(nextDataEl.html() || '{}');
        const framePath = `/q/${params.id}/frame`;
        nd.asPath = framePath;
        if (nd.query) nd.query.all = ['q', params.id, 'frame'];
        nextDataEl.html(JSON.stringify(nd));
      } catch (_) {}
    }

    // Make relative /... src/href absolute so assets load from original domain
    $('[src^="/"]').each((_, el) => {
      const v = $(el).attr('src');
      if (v && !v.startsWith('//')) $(el).attr('src', baseUrl + v);
    });
    $('[href^="/"]').each((_, el) => {
      const v = $(el).attr('href');
      if (v && !v.startsWith('//')) $(el).attr('href', baseUrl + v);
    });
    $('[srcset]').each((_, el) => {
      let ss = $(el).attr('srcset');
      if (ss) {
        ss = ss
          .split(',')
          .map((s) => {
            const p = s.trim().split(' ');
            if (p[0].startsWith('/')) p[0] = baseUrl + p[0];
            return p.join(' ');
          })
          .join(', ');
        $(el).attr('srcset', ss);
      }
    });

    // Remove debugger / anti-clone scripts
    $('script').each((_, el) => {
      const c = $(el).html() || '';
      if (c.includes('debugger')) $(el).remove();
    });

    const replacementsJson = JSON.stringify(replacements).replace(/</g, '\\u003c');
    const checkoutJson = JSON.stringify(checkoutUrl);
    const planJson = JSON.stringify({
      p1: replacements['__CHECKOUT_PLAN_1__'] || '',
      p2: replacements['__CHECKOUT_PLAN_2__'] || '',
      p3: replacements['__CHECKOUT_PLAN_3__'] || '',
    });

    $('head').prepend(`
<script id="sf-frame-v1">
(function(){
  // ── Replacements ──────────────────────────────────────────────
  window.QUIZ_REPLACEMENTS = ${replacementsJson};

  function sfApply(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var v = node.nodeValue && node.nodeValue.trim();
      if (v && window.QUIZ_REPLACEMENTS[v])
        node.nodeValue = node.nodeValue.replace(v, window.QUIZ_REPLACEMENTS[v]);
    } else if (node.nodeType === 1) {
      if (node.tagName === 'IMG') {
        var s = node.getAttribute('src');
        if (s && window.QUIZ_REPLACEMENTS[s]) node.setAttribute('src', window.QUIZ_REPLACEMENTS[s]);
      }
      node.childNodes.forEach(sfApply);
    }
  }
  var obs = new MutationObserver(function(ms) {
    ms.forEach(function(m) {
      if (m.type === 'childList') m.addedNodes.forEach(sfApply);
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function() { sfApply(document.body); });

  // ── Checkout interceptor ───────────────────────────────────────
  var CHECKOUT  = ${checkoutJson};
  var PLANS     = ${planJson};

  if (CHECKOUT || PLANS.p1) {
    document.addEventListener('click', function(e) {
      var target = e.target.closest('a,button,[role="button"],div,span');
      if (!target) return;
      var text = (target.textContent || '').toLowerCase();
      var href = target.getAttribute('href') || '';
      var r = window.QUIZ_REPLACEMENTS;

      // Pick plan URL by button text
      var planUrl = '';
      if (text.includes('mensal') || text.includes('1 m') || text.includes('plano 1')) planUrl = PLANS.p1;
      else if (text.includes('trimestral') || text.includes('3 m') || text.includes('plano 2')) planUrl = PLANS.p2;
      else if (text.includes('anual') || text.includes('12 m') || text.includes('plano 3')) planUrl = PLANS.p3;

      var isCheckout =
        planUrl ||
        text.includes('comprar') || text.includes('quero') ||
        text.includes('receber') || text.includes('checkout') ||
        text.includes('obter acesso') || text.includes('garantir') ||
        href.includes('pay.') || href.includes('checkout') ||
        href.includes('kirvano') || href.includes('perfectpay') ||
        href.includes('cakto') || href.includes('monetizze') ||
        href.includes('eduzz') || href.includes('hotmart');

      if (isCheckout) {
        var finalUrl = planUrl || CHECKOUT;
        if (finalUrl) {
          e.preventDefault();
          e.stopPropagation();
          window.parent.postMessage({ type: 'SF_CHECKOUT', url: finalUrl }, '*');
        }
      }
    }, true);
  }

  // ── Sync from editor ───────────────────────────────────────────
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SYNC_REPLACEMENTS') {
      window.QUIZ_REPLACEMENTS = e.data.replacements;
      sfApply(document.body);
    }
  });
})();
</script>
`);

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': 'frame-ancestors *;',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('SF Frame error:', err);
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem"><p>Erro ao carregar funil: ${err.message}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
