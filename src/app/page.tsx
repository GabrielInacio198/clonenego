import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import LandingPage from './landing/LandingPage';

export default async function Home() {
  const headersList = await headers();
  const rawHost = headersList.get('host') || '';
  
  // Limpar porta e o "www." para garantir que a busca bata com o DB
  const host = rawHost.split(':')[0].replace(/^www\./, '');

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

  // Comportamento padrão: Exibir a Landing Page de vendas
  return <LandingPage />;
}
