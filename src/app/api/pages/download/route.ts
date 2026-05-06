import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';
import JSZip from 'jszip';

/**
 * Super Cloner Pro — Downloader de Assets Completo
 * 
 * Estratégia:
 * 1. Baixa o HTML original.
 * 2. Mapeia todos os assets (JS, CSS, Imagens, Vídeos).
 * 3. Baixa fisicamente cada asset e coloca no ZIP.
 * 4. Reescreve o HTML para apontar para caminhos locais (assets/).
 * 5. Resolve problemas de CORS e SPA baixando o conteúdo.
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

    // 1. Fetch do HTML
    const htmlResponse = await fetch(originalUrl, { headers: { 'User-Agent': UA } });
    if (!htmlResponse.ok) throw new Error(`Erro ao acessar site original: ${htmlResponse.status}`);
    const htmlText = await htmlResponse.text();
    const $ = cheerio.load(htmlText);

    const zip = new JSZip();
    const assetsFolder = zip.folder('assets');
    const assetMap = new Map<string, string>(); // URL original -> Nome local

    async function downloadAsset(url: string, extension: string, isCss: boolean = false): Promise<string | null> {
      if (!url || url.startsWith('data:') || url.startsWith('javascript:')) return null;
      
      let absoluteUrl = url;
      if (url.startsWith('//')) absoluteUrl = 'https:' + url;
      else if (!url.startsWith('http')) absoluteUrl = url.startsWith('/') ? baseUrl + url : baseDir + url;

      const cacheKey = absoluteUrl.split('?')[0];
      if (assetMap.has(cacheKey)) return assetMap.get(cacheKey)!;

      try {
        const response = await fetch(absoluteUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) return null;
        
        let buffer = await response.arrayBuffer();
        
        // Se for CSS, processar URLs internas
        if (isCss || extension === 'css') {
          const decoder = new TextDecoder('utf-8');
          let cssText = decoder.decode(buffer);
          
          // Encontrar urls no CSS (fontes, imagens)
          const cssUrls: string[] = [];
          cssText = cssText.replace(/url\s*\(\s*['"]?([^'")]*)['"]?\s*\)/gi, (match, internalUrl) => {
            if (internalUrl.startsWith('data:') || internalUrl.startsWith('http')) return match;
            const ext = internalUrl.split('.').pop()?.split('?')[0] || 'file';
            const fileName = `sub_${Math.random().toString(36).substring(2, 8)}.${ext}`;
            cssUrls.push(internalUrl);
            return `url("${fileName}")`;
          });

          // Baixar assets do CSS (limitado para evitar recursão infinita)
          for (const internalUrl of cssUrls.slice(0, 20)) {
            const internalAbs = internalUrl.startsWith('/') ? baseUrl + internalUrl : new URL(internalUrl, absoluteUrl).href;
            try {
              const res = await fetch(internalAbs, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
              if (res.ok) {
                const subName = cssText.match(new RegExp(`url\\("([^"]+)"\\)`))?.[1] || `asset_${Math.random().toString(36).substring(2,6)}`;
                assetsFolder?.file(subName, await res.arrayBuffer());
              }
            } catch(e) {}
          }
          
          buffer = new TextEncoder().encode(cssText).buffer;
        }

        const fileName = `file_${Math.random().toString(36).substring(2, 10)}.${extension}`;
        assetsFolder?.file(fileName, buffer);
        
        assetMap.set(cacheKey, `./assets/${fileName}`);
        return `./assets/${fileName}`;
      } catch (err) {
        console.error(`Falha ao baixar asset: ${absoluteUrl}`, err);
        return absoluteUrl;
      }
    }

    // 2. Coletar Assets (Scripts, Links, Imagens)
    const assetPromises: Promise<void>[] = [];

    // Scripts
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src')!;
      assetPromises.push(downloadAsset(src, 'js').then(local => { if (local) $(el).attr('src', local); }));
      $(el).removeAttr('crossorigin');
      $(el).removeAttr('integrity');
    });

    // Stylesheets
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href')!;
      assetPromises.push(downloadAsset(href, 'css', true).then(local => { if (local) $(el).attr('href', local); }));
    });

    // Imagens
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src')!;
      const ext = src.split('.').pop()?.split('?')[0] || 'png';
      assetPromises.push(downloadAsset(src, ext).then(local => { if (local) $(el).attr('src', local); }));
    });
    
    // Favicon e outros links
    $('link[rel*="icon"]').each((_, el) => {
      const href = $(el).attr('href')!;
      assetPromises.push(downloadAsset(href, 'png').then(local => { if (local) $(el).attr('href', local); }));
    });

    // Aguardar todos os downloads (ou falhas)
    await Promise.allSettled(assetPromises);

    // 3. Injetar Lógica de Checkout (Mesma do proxy)
    if (config.checkout_url) {
        const checkoutScript = `
        <script id="sf-checkout-handler">
          (function() {
            var CHECKOUT = '${config.checkout_url}';
            var gateways = ['checkout', 'pay', 'comprar', 'hotmart', 'eduzz', 'monetizze', 'kiwify', 'braip', 'cakto', 'perfectpay', 'ticto', 'yampi', 'cartpanda', 'greenn', 'pepper'];
            
            function go(e) {
                e.preventDefault(); e.stopPropagation();
                var u = new URL(CHECKOUT);
                var p = new URLSearchParams(window.location.search);
                ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck'].forEach(function(k) {
                    if (p.get(k)) u.searchParams.set(k, p.get(k));
                });
                window.location.href = u.toString();
            }

            document.addEventListener('click', function(e) {
                var a = e.target.closest('a');
                if (a) {
                    var h = (a.getAttribute('href')||'').toLowerCase();
                    if (gateways.some(function(g){ return h.includes(g); }) || a.dataset.checkout) go(e);
                }
                var b = e.target.closest('button');
                if (b) {
                    var t = (b.textContent||'').toLowerCase();
                    if (['comprar','adquirir','garantir','quero','assinar','buy'].some(function(v){ return t.includes(v); })) go(e);
                }
            }, true);
          })();
        </script>
        `;
        $('head').append(checkoutScript);
    }

    // Injetar pixels e scripts customizados
    if (config.pixel_script) $('head').append(config.pixel_script);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    // Remover tags de base para não conflitar com caminhos locais
    $('base').remove();

    // 4. Gerar index.html e ZIP
    zip.file('index.html', $.html());
    
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
    const safeName = (page.name || 'pagina').replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50);

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      },
    });

  } catch (error: any) {
    console.error('Full ZIP Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
