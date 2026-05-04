import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    let html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(url).origin;

    // 🧬 INJEÇÃO DO DNA SNAPFUNNEL (Igual ao Seca Jejum)
    const dnaScript = `
      <script id="snapfunnel-dna">
        (function() {
          // Bloqueio de erros de History (Tela Branca)
          const n = () => {};
          Object.defineProperty(window.history, 'pushState', { value: n, writable: false });
          Object.defineProperty(window.history, 'replaceState', { value: n, writable: false });

          // Interceptar cliques para o Checkout do usuário
          document.addEventListener('click', (e) => {
            const t = e.target.closest('a, button, [role="button"]');
            if (!t) return;
            const h = t.getAttribute('href') || '';
            const c = window.__USER_CHECKOUT__;
            if ((h.includes('checkout') || h.includes('pay.') || h.includes('hotmart')) && c) {
              e.preventDefault();
              window.location.href = c + window.location.search;
            }
          }, true);
        })();
      </script>
    `;

    $('head').prepend(`<base href="${baseUrl}/">`);
    $('head').prepend(dnaScript);
    
    // Captura automática de dados
    const pageTitle = $('title').text() || 'Funil Clonado';

    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: { 
           isLegacyMode: true,
           rawHtml: $.html(), // O HTML vai com o DNA injetado!
           replacements: { "__CHECKOUT_URL__": "" }
        },
      })
      .select()
      .single();

    if (quizError) throw quizError;

    return NextResponse.json({ success: true, quiz: quizData });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
