import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  const { data: quiz } = await supabaseAdmin
    .from('quizzes')
    .select('original_url')
    .eq('id', id)
    .single();

  if (!quiz?.original_url) return new NextResponse('Erro', { status: 404 });

  try {
    const response = await fetch(quiz.original_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    let html = await response.text();
    const baseOrigin = new URL(quiz.original_url).origin;

    // Injetar apenas o comunicador de checkout
    const ghostScript = `
      <base href="${baseOrigin}/">
      <script>
        document.addEventListener('click', function(e) {
          const el = e.target.closest('a, button');
          if (!el) return;
          const href = el.getAttribute('href') || '';
          const text = el.textContent.toLowerCase();
          if (href.includes('pay') || href.includes('checkout') || text.includes('comprar') || text.includes('receber') || text.includes('quero')) {
            e.preventDefault();
            e.stopPropagation();
            window.parent.postMessage({ type: 'SNAP_CHECKOUT', url: href }, '*');
          }
        }, true);
      </script>
    `;

    html = html.replace('<head>', '<head>' + ghostScript);

    return new NextResponse(html, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *"
      }
    });
  } catch (e) {
    return new NextResponse('Erro de conexão', { status: 500 });
  }
}
