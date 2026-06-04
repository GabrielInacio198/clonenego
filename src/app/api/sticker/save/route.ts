import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { imageDataUrl, quizId, quizData } = await req.json();

    if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
      return NextResponse.json({ error: 'Imagem inválida' }, { status: 400 });
    }

    // Converte base64 para buffer para upload no Storage
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Gera um ID único para este lead
    const { data: leadData, error: insertError } = await supabaseAdmin
      .from('sticker_leads')
      .insert({
        quiz_id: quizId || null,
        nome: quizData?.nome || null,
        email: quizData?.email || null,
        clube: quizData?.clube || null,
        peso: quizData?.peso || null,
        altura: quizData?.altura || null,
        nascimento: quizData?.nascimento || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[sticker/save] Erro ao inserir lead:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const leadId = leadData.id;

    // Faz upload da imagem para o Supabase Storage
    const filePath = `${quizId || 'sem-quiz'}/${leadId}.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('stickers')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('[sticker/save] Erro ao fazer upload da imagem:', uploadError);
      // Não falha o processo — o lead foi salvo, apenas sem a URL da imagem
      return NextResponse.json({ success: true, leadId, imageUrl: null });
    }

    // Gera URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('stickers')
      .getPublicUrl(filePath);

    const imageUrl = urlData?.publicUrl || null;

    // Atualiza o lead com a URL da imagem
    await supabaseAdmin
      .from('sticker_leads')
      .update({ image_url: imageUrl })
      .eq('id', leadId);

    console.log(`[sticker/save] Lead ${leadId} salvo com sucesso. Email: ${quizData?.email}`);

    return NextResponse.json({ success: true, leadId, imageUrl });
  } catch (error: any) {
    console.error('[sticker/save] Erro geral:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
