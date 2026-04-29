import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do quiz é obrigatório' }, { status: 400 });
    }

    // 1. Buscar o quiz original
    const { data: original, error: fetchError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Quiz não encontrado' }, { status: 404 });
    }

    // 2. Criar a cópia (inserindo apenas os dados que temos certeza que existem e são seguros)
    const newQuiz = {
      user_id: original.user_id,
      name: `${original.name} (Cópia)`,
      original_url: original.original_url,
      theme_config: original.theme_config,
      font_family: original.font_family
    };

    const { data: created, error: insertError } = await supabase
      .from('quizzes')
      .insert([newQuiz])
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir cópia:', insertError);
      return NextResponse.json({ error: 'Erro ao duplicar o quiz' }, { status: 500 });
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error('Erro na API de duplicação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
