import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: Request) {
  try {
    const { pageId } = await req.json();

    if (!pageId) {
      return NextResponse.json({ error: 'pageId é obrigatório' }, { status: 400 });
    }

    // Deletar assets do storage
    const { data: files } = await supabaseAdmin.storage
      .from('page-assets')
      .list(`pages/${pageId}`, { limit: 1000 });

    if (files && files.length > 0) {
      // Listar recursivamente
      const allPaths: string[] = [];
      async function listRecursive(prefix: string) {
        const { data } = await supabaseAdmin.storage.from('page-assets').list(prefix, { limit: 1000 });
        if (!data) return;
        for (const item of data) {
          const path = `${prefix}/${item.name}`;
          if (item.metadata) {
            allPaths.push(path);
          } else {
            await listRecursive(path);
          }
        }
      }
      await listRecursive(`pages/${pageId}`);
      
      if (allPaths.length > 0) {
        await supabaseAdmin.storage.from('page-assets').remove(allPaths);
      }
    }

    // Deletar do banco
    const { error } = await supabaseAdmin
      .from('cloned_pages')
      .delete()
      .eq('id', pageId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
