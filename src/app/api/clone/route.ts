import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. Obter User ID do Valentor (Dono do Projeto)
    let validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar site: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const pageTitle = $('title').text() || 'Quiz Clonado';
    const baseUrl = new URL(url).origin;

    // 2. Corrigir caminhos de Assets para links absolutos (Evita quebrar o preview)
    $('[src], [href]').each((_, el) => {
      const attr = $(el).attr('src') ? 'src' : 'href';
      let val = $(el).attr(attr);
      if (val && val.startsWith('/') && !val.startsWith('//')) {
        $(el).attr(attr, baseUrl + val);
      }
    });

    const finalHtml = $.html();

    // 3. Salvar no Banco
    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: { 
           rawHtml: finalHtml,
           replacements: {
              "__CHECKOUT_URL__": ""
           }
        },
      })
      .select()
      .single();

    if (quizError) throw quizError;

    return NextResponse.json({ 
      success: true, 
      quiz: quizData,
      message: 'Clone concluído!'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao clonar' }, { status: 500 });
  }
}
