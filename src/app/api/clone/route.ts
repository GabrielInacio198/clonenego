import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    let html = await response.text();
    const $ = cheerio.load(html);
    const baseUrlObj = new URL(url);
    const baseUrl = baseUrlObj.origin;

    // 🧬 REESCRITA DE DNA DEFINITIVA (Igual ao que funcionava)
    const proxyPrefix = `/api/proxy?overrideHost=${encodeURIComponent(baseUrlObj.hostname)}&url=`;

    // 1. Corrigir links de Styles e Scripts antes de salvar
    $('link[rel="stylesheet"], script[src], img[src]').each((_, el) => {
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr);
      if (val && !val.startsWith('http') && !val.startsWith('//')) {
        $(el).attr(attr, proxyPrefix + encodeURIComponent(baseUrl + (val.startsWith('/') ? '' : '/') + val));
      }
    });

    // 2. Injetar a proteção de Histórico
    const dnaScript = `
      <script>
        (function() {
          // Bloqueia erros de History que causam tela branca
          const n = () => {};
          Object.defineProperty(window.history, 'pushState', { value: n, writable: false });
          Object.defineProperty(window.history, 'replaceState', { value: n, writable: false });

          // Interceptor de Checkout
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
    
    const pageTitle = $('title').text() || 'Funil Clonado';

    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: { 
           isFinalMode: true,
           rawHtml: $.html(),
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
