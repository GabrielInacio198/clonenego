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
    const targetUrl = new URL(quiz.original_url);
    const targetBaseUrl = targetUrl.origin;

    // SCRIPT SAFE-GUARD V7 + ESCUDO NUCLEAR
    const safetyScript = `
      <script>
      (function() {
        window.QUIZ_REPLACEMENTS = ${JSON.stringify(quiz.theme_config?.replacements || {})};
        
        // --- PROTEÇÃO ANTI-TELA-BRANCA ---
        const noop = () => {};
        // Impedir que o site original limpe o corpo da página
        const _origSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
        Object.defineProperty(Element.prototype, 'innerHTML', {
          set: function(val) {
            if (this.tagName === 'BODY' && (val === '' || val === ' ')) return;
            return _origSet.call(this, val);
          }
        });

        // --- ESCUDO NUCLEAR DE CHECKOUT ---
        function forceRedirect(url) {
          if (!url || typeof url !== 'string') return false;
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

        // Interceptar Cliques
        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"]');
          if (target) {
            const href = target.getAttribute('href') || '';
            if (forceRedirect(href)) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }, true);

        // Limpeza Ativa de Links
        setInterval(() => {
          document.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href && (href.includes('kirvano') || href.includes('pay.') || href.includes('checkout'))) {
              const final = window.QUIZ_REPLACEMENTS[href] || window.QUIZ_REPLACEMENTS['__CHECKOUT_URL__'];
              if (final) a.setAttribute('href', final);
            }
          });
        }, 500);

        // Bloquear window.open
        const _open = window.open;
        window.open = function(url) {
          if (url && forceRedirect(url)) return null;
          return _open.apply(this, arguments);
        };
      })();
      </script>
    `;

    // Injeção Estratégica
    html = html.replace('<head>', '<head>' + safetyScript);
    
    // Corrigir links e imagens para não quebrar
    html = html.replace(/(href|src|action)="\//g, `$1="${targetBaseUrl}/`);
    
    // Forçar base para assets relativos
    html = html.replace('<head>', '<head><base href="' + targetBaseUrl + '/">');

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (err) {
    return new Response('Erro ao carregar o quiz', { status: 500 });
  }
}
