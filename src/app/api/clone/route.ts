import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';
    const baseUrlObj = new URL(url);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    let html = await response.text();

    // 🛡️ LIMPEZA CIRÚRGICA (v19.1)
    // 1. Remover Pixels conhecidos
    html = html.replace(/<script\b[^>]*>([\s\S]*?)(facebook\.net|connect\.facebook\.net|googletagmanager|google-analytics)[\s\S]*?<\/script>/gi, '<!-- Pixel Removido -->');
    
    // 2. SUBSTITUIÇÃO SEGURA DE CHECKOUT
    // Agora apenas checkouts reais, sem quebrar links de sistema (como pay.google.com ou .js)
    const checkoutRegex = /https?:\/\/[^"']*(hotmart|perfectpay|cakto|kiwify|doppus|evviva|monetizze)[^"']*/gi;
    html = html.replace(checkoutRegex, "__CHECKOUT_URL__");

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1] : 'Funil Clonado';

    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: { 
           isV19: true,
           rawHtml: html,
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
