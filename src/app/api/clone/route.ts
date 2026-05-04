import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';
    const baseUrlObj = new URL(url);

    // 1. Baixar o HTML original para limpeza e salvamento
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    let html = await response.text();

    // 2. LIMPEZA RADICAL DE PIXELS E RASTREIOS ORIGINAIS
    // Remove scripts de Facebook, Google, Hotmart, etc.
    html = html.replace(/<script\b[^>]*>([\s\S]*?)(facebook\.net|connect\.facebook\.net|googletagmanager|google-analytics|hotmart|perfectpay|cakto)[\s\S]*?<\/script>/gi, '<!-- Pixel Removido -->');
    html = html.replace(/<img\b[^>]*src="[^"]*(facebook\.com|tr\?id=)[^"]*"[^>]*>/gi, '<!-- Pixel Imagem Removido -->');

    // 3. IDENTIFICAÇÃO DO TÍTULO
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1] : 'Funil Clonado';

    // 4. Salvar no Supabase (O HTML agora fica guardado no rawHtml)
    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: { 
           isV18: true,
           rawHtml: html, // O "coração" do site agora está salvo no seu banco
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
      message: 'Clonagem Persistente v18 concluída!'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
