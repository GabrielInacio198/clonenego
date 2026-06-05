import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    const overrideHost = searchParams.get('overrideHost');

    if (!targetUrl) {
      return new NextResponse('URL missing', { status: 400 });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': targetUrl,
      },
    });

    if (!response.ok) {
      return new NextResponse('Error fetching asset', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    // Proxy de conteúdo para JS e CSS (correção de URLs internas)
    if (contentType.includes('javascript') || contentType.includes('css')) {
      let content = await response.text();
      
      if (contentType.includes('css')) {
        // Corrigir caminhos relativos em CSS (url(../...))
        const baseUrl = new URL(targetUrl);
        const baseDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        
        content = content.replace(/url\(['"]?(?!data:)(.*?)['"]?\)/g, (match, path) => {
          if (path.startsWith('http') || path.startsWith('data:')) return match;
          const absolutePath = new URL(path, baseDir).href;
          return `url("${absolutePath}")`;
        });
      }

      if (contentType.includes('javascript') && overrideHost) {
        // Spoofing de hostname em JS
        content = content.replace(/(?<!\.)\b(?:window\.)?location\.hostname\b/g, `(window.__PROXY_HOST__ || window.location.hostname)`);
        content = content.replace(/(?<!\.)\b(?:window\.)?location\.host\b/g, `(window.__PROXY_HOST__ || window.location.host)`);
        content = content.replace(/(?<!\.)\b(?:window\.)?location\.origin\b/g, `(window.__PROXY_ORIGIN__ || window.location.origin)`);

        // Reescreve import.meta.url para o URL original do arquivo (Vite usa para resolver assets)
        content = content.replace(/\bimport\.meta\.url\b/g, `"${targetUrl}"`);

        // Reescreve dynamic imports relativos: import('./chunk-xxx.js')
        const jsOrigin = new URL(targetUrl).origin;
        content = content.replace(/\bimport\(["'](\.\.?\/[^"'\s)]+)["']\)/g, (_, path) => {
          try {
            const abs = new URL(path, targetUrl).href;
            return `import("/api/proxy?url=${encodeURIComponent(abs)}&overrideHost=${encodeURIComponent(overrideHost)}")`;
          } catch { return _; }
        });
        // Reescreve dynamic imports com caminho absoluto: import('/assets/xxx.js')
        content = content.replace(/\bimport\(["'](\/[^"'\s)]+\.js[^"']*)["']\)/g, (_, path) => {
          const abs = jsOrigin + path;
          return `import("/api/proxy?url=${encodeURIComponent(abs)}&overrideHost=${encodeURIComponent(overrideHost)}")`;
        });
      }

      // Cache de 1 hora na CDN para JS e CSS (assets estáticos raramente mudam)
      responseHeaders.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return new NextResponse(content, { headers: responseHeaders });
    }

    // Para imagens e outros assets binários — cache de 24 horas na CDN
    responseHeaders.set('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    const blob = await response.blob();
    return new NextResponse(blob, { headers: responseHeaders });

  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
