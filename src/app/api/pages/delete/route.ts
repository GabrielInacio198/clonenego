import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: Request) {
  try {
    const { pageId } = await req.json();

    if (!pageId) {
      return NextResponse.json({ error: 'pageId é obrigatório' }, { status: 400 });
    }

    // Deletar assets do storage
    try {
      const bucket = 'page-assets';
      const folderPath = `pages/${pageId}`;

      // Função recursiva para listar todos os arquivos em um diretório
      async function getAllFiles(path: string): Promise<string[]> {
        const { data, error } = await supabaseAdmin.storage.from(bucket).list(path, { limit: 1000 });
        if (error) throw error;
        if (!data || data.length === 0) return [];

        let files: string[] = [];
        for (const item of data) {
          const fullPath = `${path}/${item.name}`;
          // Se não tiver id, é uma pasta virtual
          if (!item.id) {
            const subFiles = await getAllFiles(fullPath);
            files = [...files, ...subFiles];
          } else {
            files.push(fullPath);
          }
        }
        return files;
      }

      const allFiles = await getAllFiles(folderPath);
      
      if (allFiles.length > 0) {
        // O remove aceita um array de caminhos relativos ao bucket
        await supabaseAdmin.storage.from(bucket).remove(allFiles);
      }
    } catch (storageError) {
      console.error('Erro ao limpar storage:', storageError);
      // Não trava a deleção do banco se falhar no storage
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
