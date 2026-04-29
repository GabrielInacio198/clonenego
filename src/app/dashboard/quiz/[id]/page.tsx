import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import QuizEditorClient from './QuizEditorClient';

export default async function QuizEditorPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  
  // Buscar os dados do quiz
  const { data: quiz, error: quizError } = await supabaseAdmin
    .from('quizzes')
    .select('*')
    .eq('id', params.id)
    .single();

  if (quizError || !quiz) {
    return (
      <div className="p-8 text-red-500">
        <h2>Erro ao carregar o Quiz {params.id}</h2>
        <pre>{JSON.stringify(quizError, null, 2)}</pre>
      </div>
    );
  }


  return (
    <div className="h-[calc(100vh-80px)]">
      <QuizEditorClient initialQuiz={quiz} />
    </div>
  );
}
