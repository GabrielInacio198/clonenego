import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pageId, name, config } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'pageId é obrigatório' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (config !== undefined) updateData.config = config;

    const { data, error } = await supabaseAdmin
      .from('cloned_pages')
      .update(updateData)
      .eq('id', pageId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, page: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
