import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(req: Request) {
  try {
    const { quiz, steps } = await req.json();

    // Atualiza o Quiz (Design)
    const { error: quizError } = await supabaseAdmin
      .from('quizzes')
      .update({
        name: quiz.name,
        theme_config: quiz.theme_config,
        font_family: quiz.font_family,
        updated_at: new Date().toISOString()
      })
      .eq('id', quiz.id);

    if (quizError) throw quizError;

    // Atualiza as Etapas
    // Para simplificar, apagamos as antigas e inserimos as novas (para garantir ordem e deleções)
    const { error: deleteError } = await supabaseAdmin
      .from('quiz_steps')
      .delete()
      .eq('quiz_id', quiz.id);

    if (deleteError) throw deleteError;

    const stepsToInsert = steps.map((s: any, index: number) => ({
      quiz_id: quiz.id,
      order: index + 1,
      step_type: s.step_type,
      content: s.content
    }));

    const { error: insertError } = await supabaseAdmin
      .from('quiz_steps')
      .insert(stepsToInsert);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    const { quizId, theme_config } = await req.json();

    const { error: quizError } = await supabaseAdmin
      .from('quizzes')
      .update({
        theme_config,
        updated_at: new Date().toISOString()
      })
      .eq('id', quizId);

    if (quizError) throw quizError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Visual Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
