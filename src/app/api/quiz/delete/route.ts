import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: Request) {
  try {
    const { quizId, quizIds } = await req.json();
    
    if (!quizId && (!quizIds || quizIds.length === 0)) {
      return NextResponse.json({ error: 'quizId ou quizIds obrigatório' }, { status: 400 });
    }

    let query = supabaseAdmin.from('quizzes').delete();
    
    if (quizIds && quizIds.length > 0) {
      query = query.in('id', quizIds);
    } else {
      query = query.eq('id', quizId);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
