import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('cloned_pages')
      .select('id, name, original_url, config, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ pages: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
