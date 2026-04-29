import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: quizzes, error } = await supabaseAdmin
      .from('quizzes')
      .select('id, name, original_url, created_at, theme_config')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ quizzes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
