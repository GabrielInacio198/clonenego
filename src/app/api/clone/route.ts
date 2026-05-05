import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const { data: adminUsers } = await supabaseAdmin.auth.admin.listUsers();
    let validUserId: string | undefined = adminUsers?.users[0]?.id;

    if (!validUserId) {
      const { data: newAuthUser } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin@quizcloner.com',
        password: 'password123',
        email_confirm: true
      });
      validUserId = newAuthUser?.user?.id ?? undefined;
    }

    if (!validUserId) {
      throw new Error('Não foi possível obter um usuário válido');
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro alvo: ${response.status}`);
    }

    const htmlBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    let rawHtml = decoder.decode(htmlBuffer);

    const $ = cheerio.load(rawHtml);
    const pageTitle = $('title').text() || 'Quiz Clonado';
    
    const baseUrlObj = new URL(url);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;

    // O script God Mode (safeGuard) foi movido para q/[id]/route.ts
    // Aqui no clonador, salvamos apenas o HTML limpo e com as URLs absolutas corrigidas.

    // FIX DE ASSETS Absolutos
    $('[src^="/"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('//')) {
        $(el).attr('src', baseUrl + src);
      }
    });
    $('[href^="/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('//')) {
        $(el).attr('href', baseUrl + href);
      }
    });
    $('[srcset]').each((_, el) => {
      let srcset = $(el).attr('srcset');
      if (srcset) {
        srcset = srcset.split(',').map(s => {
          let parts = s.trim().split(' ');
          if (parts[0].startsWith('/')) parts[0] = baseUrl + parts[0];
          return parts.join(' ');
        }).join(', ');
        $(el).attr('srcset', srcset);
      }
    });

    $('script').each((_, el) => {
      const src = $(el).attr('src') || '';
      const content = $(el).html() || '';
      if (src.includes('anti-clone') || content.includes('debugger')) {
        $(el).remove();
      }
    });

    const finalHtml = $.html();

    const { data: quizData, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: validUserId,
        name: pageTitle,
        original_url: url,
        theme_config: { rawHtml: finalHtml },
      })
      .select()
      .single();

    if (quizError) throw quizError;

    return NextResponse.json({ 
      success: true, 
      quiz: quizData,
      message: 'Clone Estrutural concluído com sucesso!'
    });

  } catch (error: any) {
    console.error('Ripper Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao ripar o site' }, { status: 500 });
  }
}
