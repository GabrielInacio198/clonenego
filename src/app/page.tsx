import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * SnapFunnel Home — Resolutor de Domínio Puro
 * Agora ele não redireciona mais; ele serve o conteúdo direto.
 */
export default async function Home() {
  const headersList = await headers();
  const rawHost = headersList.get('host') || '';
  const host = rawHost.split(':')[0].replace(/^www\./, '');

  // 1. Verificar se é um domínio personalizado mapeado
  if (host && !host.includes('vercel.app') && !host.includes('localhost')) {
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('id, name, original_url, theme_config')
      .eq('theme_config->>custom_domain', host)
      .single();

    if (quiz) {
      // Em vez de redirect, vamos servir o Iframe estável direto na home
      return (
        <html>
          <head>
            <title>{quiz.name || 'Funil'}</title>
            <style>{`body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff;}iframe{border:none;width:100%;height:100%;}`}</style>
          </head>
          <body>
            <iframe src={quiz.original_url} />
            <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>
          </body>
        </html>
      );
    }
  }

  // 2. Se não for domínio de quiz, vai para o dashboard
  redirect('/dashboard');
}
