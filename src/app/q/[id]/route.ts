import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 🚀 SNAPFUNNEL ENGINE v10.0 - TRANSPARENT MIRROR
 * Recriado do zero para máxima estabilidade e anti-detecção.
 * Usa a técnica de Base Tag para fidelidade visual absoluta.
 */

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  try {
    if (!id) return new NextResponse('ID missing', { status: 400 });

    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select('theme_config, original_url')
      .eq('id', id)
      .single();

    if (error || !quiz || !quiz.original_url) {
      return new NextResponse('Quiz não encontrado', { status: 404 });
    }

    // 1. Capturar o site original de forma limpa
    const response = await fetch(quiz.original_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error("Site original offline ou bloqueando o servidor.");

    const rawHtml = await response.text();
    const baseUrl = new URL(quiz.original_url).origin;
    const replacements = quiz.theme_config?.replacements || {};
    const checkoutUrl = replacements['__CHECKOUT_URL__'] || "";

    // 2. Injeção de Scripts de Controle (Checkout e UTMs)
    const injection = `
      <base href="${baseUrl}/">
      <script>
        (function() {
          // Prevenção de fuga de frame e redirecionamentos indesejados
          window.onbeforeunload = null;
          
          const checkout = "${checkoutUrl}";
          document.addEventListener('click', function(e) {
            const el = e.target.closest('a, button');
            if (!el || !checkout) return;
            const text = el.textContent.toLowerCase();
            const href = el.getAttribute('href') || '';
            
            // Interceptar gatilhos de compra
            if (href.includes('pay') || href.includes('checkout') || text.includes('comprar') || text.includes('receber')) {
              e.preventDefault();
              window.top.location.href = checkout + window.location.search;
            }
          }, true);
        })();
      </script>
      <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
    `;

    // 3. Montagem do HTML Final (Inserção Atômica no Head)
    let finalHtml = rawHtml;
    if (finalHtml.includes('<head>')) {
      finalHtml = finalHtml.replace('<head>', '<head>' + injection);
    } else if (finalHtml.includes('<HEAD>')) {
      finalHtml = finalHtml.replace('<HEAD>', '<HEAD>' + injection);
    } else {
      finalHtml = injection + finalHtml;
    }

    return new NextResponse(finalHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err: any) {
    return new NextResponse(`Erro Crítico: ${err.message}`, { status: 500 });
  }
}
