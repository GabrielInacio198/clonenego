import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Page Cloner — Modo Proxy (igual ao God Mode dos quizzes)
 * 
 * NÃO baixa assets. Apenas salva a URL original no banco.
 * A mágica acontece no `/p/[id]` que faz proxy reverso em tempo real.
 * Funciona com QUALQUER tipo de página (WordPress, React, Angular, etc.)
 */

export async function POST(req: Request) {
  try {
    const { url, name } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    // Validar se a URL é acessível
    const testResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!testResponse.ok) {
      throw new Error(`Não foi possível acessar a URL: ${testResponse.status} ${testResponse.statusText}`);
    }

    // Extrair título da página se não informado
    let pageTitle = name?.trim();
    if (!pageTitle) {
      try {
        const html = await testResponse.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        pageTitle = titleMatch?.[1]?.trim() || 'Página Clonada';
      } catch {
        pageTitle = 'Página Clonada';
      }
    }

    // Salvar no banco (só URL + config, sem baixar nada)
    const { data: pageData, error: dbError } = await supabaseAdmin
      .from('cloned_pages')
      .insert({
        name: pageTitle,
        original_url: url,
        html_content: null, // Não precisa mais — usamos proxy reverso
        assets: {},
        config: {},
      })
      .select()
      .single();

    if (dbError) {
      if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
        throw new Error('A tabela "cloned_pages" ainda não foi criada no Supabase. Execute a migration SQL no painel do Supabase.');
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      page: pageData,
      message: `Página "${pageTitle}" clonada com sucesso! Acesse via proxy reverso.`,
    });

  } catch (error: any) {
    console.error('Page Clone Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao clonar a página' },
      { status: 500 }
    );
  }
}
