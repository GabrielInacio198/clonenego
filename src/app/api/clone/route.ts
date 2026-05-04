import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';
    const baseUrlObj = new URL(url);
    const baseUrl = baseUrlObj.origin;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    let html = await response.text();
    const $ = cheerio.load(html);

    // 🚀 GOD MODE v7: REESCRITA OBRIGATÓRIA VIA PROXY
    const proxyPrefix = `/api/proxy?overrideHost=${encodeURIComponent(baseUrlObj.hostname)}&url=`;

    // 1. Forçar cada recurso a passar pelo Proxy antes de salvar
    $('script[src], link[rel="stylesheet"], img[src]').each((_, el) => {
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr);
      if (val) {
        let absoluteUrl = val;
        if (!val.startsWith('http') && !val.startsWith('//')) {
          absoluteUrl = baseUrl + (val.startsWith('/') ? '' : '/') + val;
        } else if (val.startsWith('//')) {
          absoluteUrl = 'https:' + val;
        }
        $(el).attr(attr, proxyPrefix + encodeURIComponent(absoluteUrl));
      }
    });

    // 2. Substituir URLs de checkout reais por placeholder editável
    let processedHtml = $.html();
    const checkoutRegex = /https?:\/\/[^"'\s]*(hotmart|perfectpay|cakto|kiwify|doppus|evviva|monetizze|pay\.hotmart)[^"'\s]*/gi;
    processedHtml = processedHtml.replace(checkoutRegex, '__CHECKOUT_URL__');
    const $2 = cheerio.load(processedHtml);

    // 3. Injetar a "Vacina" de History API (bloqueia pushState/replaceState)
    const vaccine = `<script id="god-mode-v7-vaccine">(function(){try{var n=function(){};Object.defineProperty(window.history,'pushState',{value:n,writable:false});Object.defineProperty(window.history,'replaceState',{value:n,writable:false});}catch(e){}})();</script>`;
    $2('head').prepend(vaccine);
    $2('head').prepend(`<base href="${baseUrl}/">`);

    // 4. Remover scripts anti-clone do original
    $2('script').each((_, el) => {
      const src = $2(el).attr('src') || '';
      const content = $2(el).html() || '';
      if (src.includes('anti-clone') || content.includes('anti-clone')) $2(el).remove();
    });

    const pageTitle = $2('title').text().trim() || 'Funil Clonado';

    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: {
           isGodModeV7: true,
           rawHtml: $2.html(),
           replacements: { '__CHECKOUT_URL__': '' }
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
