import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  return handleProxy(req);
}

export async function POST(req: Request) {
  return handleProxy(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

async function handleProxy(req: Request) {
  const urlObj = new URL(req.url);
  const targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // 1. Segurança: Validar se o domínio é permitido
    const targetUrlObj = new URL(targetUrl);
    const targetDomain = targetUrlObj.hostname;
    
    // Domínios de rastreamento sempre permitidos
    const whiteList = [
      'cdn.utmify.com.br', 
      'connect.facebook.net', 
      'facebook.com', 
      'googletagmanager.com', 
      'google-analytics.com'
    ];

    if (!whiteList.some(d => targetDomain.includes(d))) {
      // Verificar se o domínio pertence a algum quiz clonado no banco
      const { data: isAuthorized } = await supabaseAdmin
        .from('quizzes')
        .select('id')
        .ilike('original_url', `%${targetDomain}%`)
        .limit(1);

      if (!isAuthorized || isAuthorized.length === 0) {
        console.warn('Proxy bloqueado para:', targetDomain);
        return NextResponse.json({ error: 'Domínio não autorizado pelo Proxy' }, { status: 403 });
      }
    }

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'host' && lowerKey !== 'origin' && lowerKey !== 'referer' && lowerKey !== 'content-encoding') {
        headers.set(key, value);
      }
    });

    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual'
    });

    const responseBody = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);
    
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.delete('content-encoding');

    const contentType = responseHeaders.get('content-type') || '';
    const overrideHost = urlObj.searchParams.get('overrideHost');

    // Se for JS e tivermos um overrideHost, fazemos a magia de enganar o script
    if (overrideHost && (contentType.includes('javascript') || targetUrl.endsWith('.js'))) {
        const decoder = new TextDecoder('utf-8');
        let jsContent = decoder.decode(responseBody);
        
        // Substituir as chamadas de location para o host alvo
        jsContent = jsContent.replace(/window\.location\.hostname/g, `"${overrideHost}"`);
        jsContent = jsContent.replace(/document\.location\.hostname/g, `"${overrideHost}"`);
        jsContent = jsContent.replace(/location\.hostname/g, `"${overrideHost}"`);
        
        jsContent = jsContent.replace(/window\.location\.host/g, `"${overrideHost}"`);
        jsContent = jsContent.replace(/document\.location\.host/g, `"${overrideHost}"`);
        jsContent = jsContent.replace(/location\.host/g, `"${overrideHost}"`);

        jsContent = jsContent.replace(/window\.location\.origin/g, `"https://${overrideHost}"`);
        jsContent = jsContent.replace(/document\.location\.origin/g, `"https://${overrideHost}"`);
        jsContent = jsContent.replace(/location\.origin/g, `"https://${overrideHost}"`);

        return new NextResponse(jsContent, {
            status: response.status,
            headers: responseHeaders
        });
    }

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
