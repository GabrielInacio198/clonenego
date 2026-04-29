import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !quiz) {
    return new Response('Quiz não encontrado', { status: 404 });
  }

  try {
    const response = await fetch(quiz.original_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    let html = await response.text();
    const targetBaseUrl = new URL(quiz.original_url).origin;

    // SCRIPT ESTÁVEL E SEGURO (Versão Corrigida)
    const safetyScript = `
      <script>
      (function() {
        window.QUIZ_REPLACEMENTS = ${JSON.stringify(quiz.theme_config?.replacements || {})};
        
        // Função de Redirecionamento Simples
        function handleCheckout(url) {
          const replacements = window.QUIZ_REPLACEMENTS || {};
          const global = replacements['__CHECKOUT_URL__'];
          const specific = replacements[url];
          const final = specific || global;

          if (final && (url.includes('kirvano') || url.includes('pay.') || url.includes('checkout') || url.includes('perfectpay') || url.includes('cakto'))) {
            window.location.href = final;
            return true;
          }
          return false;
        }

        // Interceptar Cliques sem quebrar o site
        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"]');
          if (target) {
            const href = target.getAttribute('href') || '';
            const text = target.textContent?.toLowerCase() || '';
            
            if (handleCheckout(href)) {
              e.preventDefault();
              e.stopPropagation();
            } else if (text.includes('receber') || text.includes('comprar')) {
              // Se o botão não tem link mas tem texto de checkout, tenta o global
              const global = window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'];
              if (global) {
                e.preventDefault();
                window.location.href = global;
              }
            }
          }
        }, true);

        // Bloquear window.open para checkouts
        const _open = window.open;
        window.open = function(url) {
          if (url && handleCheckout(url)) return null;
          return _open.apply(this, arguments);
        };
      })();
      </script>
    `;

    // 1. Injetar tag <base> no topo para carregar imagens/estilos sem erro
    html = html.replace('<head>', '<head><base href="' + targetBaseUrl + '/">');
    
    // 2. Injetar o script de checkout no FINAL do body para não interferir no carregamento inicial
    html = html.replace('</body>', safetyScript + '</body>');

    return new Response(html, {
      headers: { 
        'Content-Type': 'text/html',
        // Remover proteções de segurança que podem causar tela branca
        'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';",
        'X-Frame-Options': 'ALLOWALL'
      }
    });

  } catch (err) {
    return new Response('Erro ao carregar o quiz', { status: 500 });
  }
}
