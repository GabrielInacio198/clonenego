import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Home — Resolutor de Domínio Puro
 */
export default async function Home() {
  const headersList = await headers();
  const rawHost = headersList.get('host') || '';
  const host = rawHost.split(':')[0].replace(/^www\./, '');

  // 1. Verificar se é um domínio personalizado mapeado
  if (host && !host.includes('vercel.app') && !host.includes('localhost')) {
    
    // Tentar achar em cloned_pages primeiro
    const { data: page } = await supabaseAdmin
      .from('cloned_pages')
      .select('id')
      .eq('config->>custom_domain', host)
      .single();

    if (page) {
      redirect(`/p/${page.id}`);
    }

    // Tentar achar em quizzes
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .eq('theme_config->>custom_domain', host)
      .single();

    if (quiz) {
      redirect(`/q/${quiz.id}`);
    }
  }

  // 2. Se não for domínio mapeado, vai para o dashboard
  redirect('/dashboard');
}
