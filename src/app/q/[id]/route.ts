import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 🚀 SNAPFUNNEL GOD MODE v8.5 - ESTABILIDADE MÁXIMA
 * Sem dependências externas (No Cheerio) para garantir funcionamento no Next 16/React 19.
 */

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  try {
    if (!id) throw new Error("ID ausente");

    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select('theme_config, original_url')
      .eq('id', id)
      .single();

    if (error || !quiz) throw new Error("Quiz não encontrado");

    const themeConfig = quiz.theme_config || {};
    const replacements = themeConfig.replacements || {};
    const checkoutUrl = replacements['__CHECKOUT_URL__'] || "";
    const baseUrl = new URL(quiz.original_url).origin;
    
    let html = themeConfig.rawHtml || "";

    if (!html) {
      const res = await fetch(quiz.original_url);
      if (res.ok) html = await res.text();
    }

    // Injeção de Segurança e Controle
    const script = `
      <script>
        (function() {
          // Desativar anti-frame
          try { window.top = window.self; window.parent = window.self; } catch(e) {}
          
          const checkout = "${checkoutUrl}";
          document.addEventListener('click', function(e) {
            const el = e.target.closest('a, button');
            if (!el || !checkout) return;
            const text = el.textContent.toLowerCase();
            const href = el.getAttribute('href') || '';
            if (href.includes('pay') || href.includes('checkout') || text.includes('comprar')) {
              e.preventDefault();
              window.location.href = checkout + window.location.search;
            }
          }, true);
        })();
      </script>
      <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
    `;

    let finalHtml = html;
    
    // Injetar scripts e corrigir links básicos (String Replace para não travar o servidor)
    finalHtml = finalHtml.replace(/<\/head>/i, `${script}</head>`);
    
    if (baseUrl) {
      finalHtml = finalHtml.split('src="/').join(`src="${baseUrl}/`);
      finalHtml = finalHtml.split('href="/').join(`href="${baseUrl}/`);
    }

    return new NextResponse(finalHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy': 'frame-ancestors *'
      }
    });

  } catch (err: any) {
    return new NextResponse(`Erro: ${err.message}`, { status: 500 });
  }
}
