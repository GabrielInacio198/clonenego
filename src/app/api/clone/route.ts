import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';

    // 🕵️ HEADERS DE NAVEGADOR REAL (O segredo do sucesso antigo)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
       throw new Error(`Erro ao acessar o site original: ${response.status}`);
    }

    let html = await response.text();
    const $ = cheerio.load(html);

    // 1. Capturar o nome real do site para o Dash
    const pageTitle = $('title').text() || 'Funil Clonado';

    // 2. Limpeza Prévia (DNA Clean)
    // Removemos os pixels originais antes de salvar
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      if (content.includes('facebook.net') || content.includes('googletagmanager')) {
        $(el).remove();
      }
    });

    // 3. Salvar no Supabase (Exatamente como antes)
    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle, // Aqui o nome volta a ser automático!
        original_url: url,
        theme_config: { 
           isV23: true,
           rawHtml: $.html(), // Salvamos o HTML limpo
           replacements: { "__CHECKOUT_URL__": "" }
        },
      })
      .select()
      .single();

    if (quizError) throw quizError;

    return NextResponse.json({ success: true, quiz: quizData });

  } catch (error: any) {
    console.error('Erro na clonagem:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
