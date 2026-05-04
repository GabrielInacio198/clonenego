import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // ID do Valentor
    const validUserId = '69b94a96-14d4-41a8-83a5-71e18ffb6c02';
    
    // Capturar o título do site para o dashboard
    const response = await fetch(url);
    const html = await response.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1] : 'Novo Funil';

    // Salvar apenas o essencial (URL original e Nome)
    // O motor v10.0 cuidará do carregamento "Live"
    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: { 
           isV10: true,
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
      message: 'Clone v10.0 concluído!'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro na clonagem v10' }, { status: 500 });
  }
}
