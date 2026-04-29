import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { quizId, answers, metadata, contactInfo } = await req.json();

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
    }

    const { data: leadData, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        quiz_id: quizId,
        metadata: { answers, ...metadata },
        contact_info: contactInfo || {}
      })
      .select()
      .single();

    if (leadError) throw leadError;

    return NextResponse.json({ success: true, lead: leadData });
  } catch (error: any) {
    console.error('Lead Capture Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
