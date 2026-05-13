import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';
import JSZip from 'jszip';

/**
 * Super Cloner Pro v2.0 — Downloader de Assets Ultra-Resiliente
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export async function GET(req: NextRequest) {
  try {
    const pageId = req.nextUrl.searchParams.get('id');
    if (!pageId) return NextResponse.json({ error: 'ID da página é obrigatório' }, { status: 400 });

    const { data: page, error: dbError } = await supabaseAdmin
      .from('cloned_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (dbError || !page) return NextResponse.json({ error: 'Página não encontrada' }, { status: 404 });

    const originalUrl = page.original_url;
    const config = page.config || {};
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
    const baseDir = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);

    const htmlResponse = await fetch(originalUrl, { headers: { 'User-Agent': UA } });
    if (!htmlResponse.ok) throw new Error(`Erro ao acessar site original: ${htmlResponse.status}`);
    const htmlText = await htmlResponse.text();
    const $ = cheerio.load(htmlText);

    const zip = new JSZip();
    const assetsFolder = zip.folder('assets');
    const assetMap = new Map<string, string>();

    async function downloadAsset(url: string, extension: string): Promise<string | null> {
      if (!url || url.startsWith('data:') || url.startsWith('javascript:')) return null;
      
      let absoluteUrl = url.split(' ')[0]; // Limpar srcset se vier
      if (absoluteUrl.startsWith('//')) absoluteUrl = 'https:' + absoluteUrl;
      else if (!absoluteUrl.startsWith('http')) absoluteUrl = absoluteUrl.startsWith('/') ? baseUrl + absoluteUrl : baseDir + absoluteUrl;

      const cacheKey = absoluteUrl.split('?')[0];
      if (assetMap.has(cacheKey)) return assetMap.get(cacheKey)!;

      try {
        const response = await fetch(absoluteUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) return null;
        
        let buffer = await response.arrayBuffer();
        
        // Se for CSS, tentar resolver fontes básicas
        if (extension === 'css') {
          let cssText = new TextDecoder('utf-8').decode(buffer);
          cssText = cssText.replace(/url\(['"]?([^'")]*)['"]?\)/gi, (match, path) => {
             if (path.startsWith('http') || path.startsWith('data:')) return match;
             return `url("${path.split('/').pop()}")`; 
          });
          buffer = new TextEncoder().encode(cssText).buffer;
        }

        const fileName = `asset_${Math.random().toString(36).substring(2, 10)}.${extension}`;
        assetsFolder?.file(fileName, buffer);
        
        const localPath = `./assets/${fileName}`;
        assetMap.set(cacheKey, localPath);
        return localPath;
      } catch (err) {
        return null;
      }
    }

    const assetPromises: Promise<void>[] = [];

    // 1. SCRIPTS E STYLES
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src')!;
      assetPromises.push(downloadAsset(src, 'js').then(local => { if (local) $(el).attr('src', local); }));
      $(el).removeAttr('crossorigin').removeAttr('integrity');
    });

    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href')!;
      assetPromises.push(downloadAsset(href, 'css').then(local => { if (local) $(el).attr('href', local); }));
    });

    // 2. IMAGENS (Suporte a Lazy Loading e Srcset)
    $('img, source').each((_, el) => {
      const attrs = ['src', 'srcset', 'data-src', 'data-lazy-src', 'data-original'];
      attrs.forEach(attr => {
        const val = $(el).attr(attr);
        if (val) {
           const ext = val.split('.').pop()?.split('?')[0].substring(0,4) || 'png';
           assetPromises.push(downloadAsset(val, ext).then(local => { 
             if (local) {
               $(el).attr(attr, local);
               if (attr !== 'src') $(el).attr('src', local); // Forçar src para garantir que apareça
             }
           }));
        }
      });
    });

    // 3. BACKGROUND IMAGES EM INLINE STYLE
    $('[style*="background"]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const match = style.match(/url\(['"]?([^'")]*)['"]?\)/i);
      if (match && match[1]) {
        const url = match[1];
        assetPromises.push(downloadAsset(url, 'png').then(local => {
          if (local) $(el).attr('style', style.replace(url, local));
        }));
      }
    });

    await Promise.allSettled(assetPromises);

    // 4. LÓGICA DE CHECKOUT
    if (config.checkout_url) {
        const checkoutScript = `<script>
          (function() {
            var url = '${config.checkout_url}';
            var gates = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper', 'lastlink'];
            document.addEventListener('click', function(e) {
                var a = e.target.closest('a');
                if (a && gates.some(g => (a.href||'').toLowerCase().includes(g))) {
                    e.preventDefault();
                    var target = new URL(url);
                    var params = new URLSearchParams(window.location.search);
                    params.forEach((v, k) => target.searchParams.set(k, v));
                    window.location.href = target.toString();
                }
            }, true);
          })();
        </script>`;
        $('head').append(checkoutScript);
    }

    if (config.pixel_script) $('head').append(config.pixel_script);
    $('base').remove();
    zip.file('index.html', $.html());
    
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
    const safeName = (page.name || 'pagina').replace(/[^a-zA-Z0-9_\-]/g, '_');

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
