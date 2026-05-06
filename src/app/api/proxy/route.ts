import { NextResponse } from 'next/server';

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(targetUrl).origin + '/',
        'Origin': new URL(targetUrl).origin,
      },
      body,
      redirect: 'follow'
    });

    const responseBody = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);
    
    // 1. LIMPEZA DE SEGURANÇA (Anti-Anti-Cloning)
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('X-Frame-Options', 'ALLOWALL');
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('cross-origin-opener-policy');
    responseHeaders.delete('cross-origin-embedder-policy');
    responseHeaders.delete('cross-origin-resource-policy');

    const contentType = responseHeaders.get('content-type') || '';
    const overrideHost = urlObj.searchParams.get('overrideHost');

    // 2. JS SPOOFING (Deep Fix para SPAs)
    if (overrideHost && (contentType.includes('javascript') || targetUrl.endsWith('.js'))) {
        const decoder = new TextDecoder('utf-8');
        let jsContent = decoder.decode(responseBody);
        
        const hostOnly = overrideHost.split(':')[0];
        const origin = `https://${overrideHost}`;

        // Substituições seguras (não quebram se estiverem dentro de strings ou acessos de propriedades)
        // O God Mode injeta window.__PROXY_HOST__ na página principal.
        jsContent = jsContent.replace(/(?<!\.)\b(?:window\.)?location\.hostname\b/g, `(window.__PROXY_HOST__ || window.location.hostname)`);
        jsContent = jsContent.replace(/(?<!\.)\b(?:window\.)?location\.host\b/g, `(window.__PROXY_HOST__ || window.location.host)`);
        jsContent = jsContent.replace(/(?<!\.)\b(?:window\.)?location\.origin\b/g, `(window.__PROXY_ORIGIN__ || window.location.origin)`);
        jsContent = jsContent.replace(/(?<!\.)\b(?:window\.)?location\.pathname\b/g, `(window.__PROXY_PATH__ || window.location.pathname)`);
        jsContent = jsContent.replace(/(?<!\.)\b(?:window\.)?location\.href\b/g, `(window.__PROXY_HREF__ || window.location.href)`);

        responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        responseHeaders.set('Pragma', 'no-cache');
        responseHeaders.set('Expires', '0');

        return new NextResponse(jsContent, {
            status: response.status,
            headers: responseHeaders
        });
    }

    // 3. CSS ASSET FIX
    if (contentType.includes('css') || targetUrl.endsWith('.css')) {
        const decoder = new TextDecoder('utf-8');
        let cssContent = decoder.decode(responseBody);
        
        const targetUrlObj = new URL(targetUrl);
        const baseUrl = targetUrlObj.origin;
        const dirUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

        cssContent = cssContent.replace(/url\s*\(\s*['"]?([^'")]*)['"]?\s*\)/gi, (match, url) => {
            if (url.startsWith('data:') || url.startsWith('javascript:')) return match;
            
            let absolute = url;
            if (url.startsWith('//')) {
                absolute = 'https:' + url;
            } else if (!url.startsWith('http')) {
                absolute = url.startsWith('/') ? baseUrl + url : dirUrl + url;
            }
            
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

    // 4. MODO TRANSPARENTE
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
