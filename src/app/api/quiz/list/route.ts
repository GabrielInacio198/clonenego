import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: quizzesData, error } = await supabaseAdmin
      .from('quizzes')
      .select('id, name, original_url, created_at, theme_config, views:quiz_views(count)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const quizzes = quizzesData.map((q: any) => ({
      ...q,
      views: q.views && q.views[0] ? q.views[0].count : 0
    }));

    return NextResponse.json({ quizzes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
