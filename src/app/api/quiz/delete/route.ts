import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: Request) {
  try {
    const { quizId } = await req.json();
    if (!quizId) return NextResponse.json({ error: 'quizId obrigatório' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
