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
      headers: {
        ...Object.fromEntries(headers),
        'Referer': new URL(targetUrl).origin + '/',
        'Origin': new URL(targetUrl).origin,
      },
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

    // Se for CSS, reescrevemos as URLs internas (fontes, imagens) para serem absolutas
    if (contentType.includes('css') || targetUrl.endsWith('.css')) {
        const decoder = new TextDecoder('utf-8');
        let cssContent = decoder.decode(responseBody);
        
        const targetUrlObj = new URL(targetUrl);
        const baseUrl = targetUrlObj.origin;
        const dirUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

        // Regex para encontrar url(...) - lidando com aspas opcionais e espaços
        cssContent = cssContent.replace(/url\s*\(\s*['"]?([^'")]*)['"]?\s*\)/gi, (match, url) => {
            if (url.startsWith('data:') || url.startsWith('javascript:')) {
                return match;
            }
            
            // Tornar URL absoluta
            let absolute = url;
            if (url.startsWith('//')) {
                absolute = 'https:' + url;
            } else if (!url.startsWith('http')) {
                absolute = url.startsWith('/') ? baseUrl + url : dirUrl + url;
            }
            
            // Proxiar fontes para evitar CORS
            if (/\.(woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url.split('#')[0].split('?')[0])) {
                return `url("/api/proxy?url=${encodeURIComponent(absolute)}&overrideHost=${overrideHost || ''}")`;
            }
            
            return `url("${absolute}")`;
        });

        return new NextResponse(cssContent, {
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
