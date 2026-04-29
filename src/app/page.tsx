import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  // Se o host não for o padrão da Vercel (ou localhost), tentamos achar o quiz
  if (host && !host.includes('vercel.app') && !host.includes('localhost')) {
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .eq('theme_config->>custom_domain', host)
      .single();

    if (quiz) {
      redirect(`/q/${quiz.id}`);
    }
  }

  // Comportamento padrão (redireciona para o login ou dashboard)
  redirect('/dashboard');
}
