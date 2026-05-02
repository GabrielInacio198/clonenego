import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Deep Page Cloner — Clona qualquer página com TODOS os assets
 * 
 * Motor de clonagem estilo SaveWebZip:
 * 1. Faz fetch do HTML da URL
 * 2. Encontra TODOS os assets (CSS, JS, imagens, fontes)
 * 3. Baixa cada asset e guarda no Supabase Storage
 * 4. Reescreve as URLs no HTML para apontar ao storage
 * 5. Salva o HTML final no banco
 */

const STORAGE_BUCKET = 'page-assets';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Extensões de assets para identificar tipo de conteúdo
function getContentType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    css: 'text/css', js: 'application/javascript',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
    ttf: 'font/ttf', eot: 'application/vnd.ms-fontobject',
    mp4: 'video/mp4', webm: 'video/webm',
  };
  return map[ext] || 'application/octet-stream';
}

// Resolve URL relativa para absoluta
function resolveUrl(base: string, relative: string): string {
  try {
    if (relative.startsWith('data:') || relative.startsWith('blob:') || relative.startsWith('#')) return '';
    if (relative.startsWith('//')) return 'https:' + relative;
    return new URL(relative, base).href;
  } catch {
    return '';
  }
}

// Gera um nome de arquivo seguro para storage
function safeFileName(url: string, index: number): string {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname.replace(/^\//, '') || `asset_${index}`;
    // Limpar caracteres problemáticos
    path = path.replace(/[^a-zA-Z0-9._\-\/]/g, '_');
    if (path.length > 100) path = path.slice(-100);
    // Garantir extensão
    if (!path.includes('.')) {
      const ext = urlObj.searchParams.get('format') || 'bin';
      path += '.' + ext;
    }
    return path;
  } catch {
    return `asset_${index}.bin`;
  }
}

// Baixa um asset e faz upload pro Supabase Storage
async function downloadAndStore(url: string, pageId: string, index: number): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000), // Timeout de 15s por asset
    });
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) return null;
    
    // Limitar tamanho (max 10MB por asset)
    if (buffer.byteLength > 10 * 1024 * 1024) return null;

    const fileName = safeFileName(url, index);
    const storagePath = `pages/${pageId}/${fileName}`;
    const contentType = response.headers.get('content-type') || getContentType(url);

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`Upload error for ${url}:`, error.message);
      return null;
    }

    // Gerar URL pública
    const { data: publicUrl } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return publicUrl.publicUrl;
  } catch (err: any) {
    console.error(`Failed to download ${url}: ${err.message}`);
    return null;
  }
}

// Processa CSS para encontrar url() references e baixar
async function processCssUrls(cssContent: string, cssBaseUrl: string, pageId: string, assetMap: Map<string, string>, counter: { n: number }): Promise<string> {
  const urlRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  let match;
  const replacements: { original: string; resolved: string; stored: string }[] = [];

  while ((match = urlRegex.exec(cssContent)) !== null) {
    const rawUrl = match[1];
    if (rawUrl.startsWith('data:')) continue;
    
    const resolved = resolveUrl(cssBaseUrl, rawUrl);
    if (!resolved) continue;

    if (assetMap.has(resolved)) {
      replacements.push({ original: rawUrl, resolved, stored: assetMap.get(resolved)! });
    } else {
      const stored = await downloadAndStore(resolved, pageId, counter.n++);
      if (stored) {
        assetMap.set(resolved, stored);
        replacements.push({ original: rawUrl, resolved, stored });
      }
    }
  }

  let result = cssContent;
  for (const r of replacements) {
    result = result.split(r.original).join(r.stored);
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const { url, name } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    // 1. Fetch HTML
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar o site: ${response.status} ${response.statusText}`);
    }

    const htmlBuffer = await response.arrayBuffer();
    const rawHtml = new TextDecoder('utf-8').decode(htmlBuffer);

    // 2. Gerar ID da página
    const pageId = crypto.randomUUID();

    // 3. Garantir que o bucket existe
    await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {});

    // 4. Parse HTML com Cheerio
    const $ = cheerio.load(rawHtml);
    const pageTitle = name || $('title').text().trim() || 'Página Clonada';
    const baseUrl = url;
    const baseUrlObj = new URL(url);
    const origin = `${baseUrlObj.protocol}//${baseUrlObj.host}`;

    const assetMap = new Map<string, string>();
    const counter = { n: 0 };

    // 5. Processar CSS externas (<link rel="stylesheet">)
    const cssLinks = $('link[rel="stylesheet"]');
    for (let i = 0; i < cssLinks.length; i++) {
      const el = cssLinks[i];
      const href = $(el).attr('href');
      if (!href) continue;
      
      const absoluteUrl = resolveUrl(baseUrl, href);
      if (!absoluteUrl) continue;

      try {
        const cssRes = await fetch(absoluteUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
        if (!cssRes.ok) continue;
        
        let cssContent = await cssRes.text();
        // Processar url() dentro do CSS
        cssContent = await processCssUrls(cssContent, absoluteUrl, pageId, assetMap, counter);
        
        // Upload do CSS processado
        const cssPath = `pages/${pageId}/css/style_${i}.css`;
        await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(cssPath, cssContent, {
          contentType: 'text/css',
          upsert: true,
        });
        
        const { data: cssPublicUrl } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(cssPath);
        $(el).attr('href', cssPublicUrl.publicUrl);
      } catch (err: any) {
        console.error(`CSS fetch error: ${err.message}`);
      }
    }

    // 6. Processar inline <style> tags com url()
    $('style').each((i, el) => {
      const styleContent = $(el).html();
      if (styleContent && styleContent.includes('url(')) {
        // Será processado assincronamente abaixo
      }
    });
    // Processamento assíncrono dos styles inline
    const styleElements = $('style').toArray();
    for (const el of styleElements) {
      const content = $(el).html();
      if (content && content.includes('url(')) {
        const processed = await processCssUrls(content, baseUrl, pageId, assetMap, counter);
        $(el).html(processed);
      }
    }

    // 7. Processar imagens
    const imgElements = $('img, source, video, audio').toArray();
    for (const el of imgElements) {
      // src
      const src = $(el).attr('src');
      if (src) {
        const absoluteUrl = resolveUrl(baseUrl, src);
        if (absoluteUrl && !absoluteUrl.startsWith('data:')) {
          if (assetMap.has(absoluteUrl)) {
            $(el).attr('src', assetMap.get(absoluteUrl)!);
          } else {
            const stored = await downloadAndStore(absoluteUrl, pageId, counter.n++);
            if (stored) {
              assetMap.set(absoluteUrl, stored);
              $(el).attr('src', stored);
            }
          }
        }
      }
      // srcset
      const srcset = $(el).attr('srcset');
      if (srcset) {
        const newSrcset = await Promise.all(
          srcset.split(',').map(async (entry) => {
            const parts = entry.trim().split(/\s+/);
            const srcUrl = parts[0];
            const resolved = resolveUrl(baseUrl, srcUrl);
            if (!resolved) return entry;
            
            if (assetMap.has(resolved)) {
              parts[0] = assetMap.get(resolved)!;
            } else {
              const stored = await downloadAndStore(resolved, pageId, counter.n++);
              if (stored) {
                assetMap.set(resolved, stored);
                parts[0] = stored;
              }
            }
            return parts.join(' ');
          })
        );
        $(el).attr('srcset', newSrcset.join(', '));
      }
    }

    // 8. Processar scripts
    const scriptElements = $('script[src]').toArray();
    for (const el of scriptElements) {
      const src = $(el).attr('src');
      if (!src) continue;
      
      const content = $(el).html() || '';
      // Remover anti-clone
      if (src.includes('anti-clone') || content.includes('debugger')) {
        $(el).remove();
        continue;
      }

      const absoluteUrl = resolveUrl(baseUrl, src);
      if (!absoluteUrl) continue;

      if (assetMap.has(absoluteUrl)) {
        $(el).attr('src', assetMap.get(absoluteUrl)!);
      } else {
        const stored = await downloadAndStore(absoluteUrl, pageId, counter.n++);
        if (stored) {
          assetMap.set(absoluteUrl, stored);
          $(el).attr('src', stored);
        }
      }
    }

    // 9. Processar favicons e outros <link>
    $('link[href]').each((_, el) => {
      const rel = $(el).attr('rel') || '';
      if (rel.includes('stylesheet')) return; // Já processado
      const href = $(el).attr('href');
      if (href && !href.startsWith('data:') && !href.startsWith('#')) {
        const absoluteUrl = resolveUrl(baseUrl, href);
        if (absoluteUrl && assetMap.has(absoluteUrl)) {
          $(el).attr('href', assetMap.get(absoluteUrl)!);
        }
      }
    });
    // Favicons async
    const linkElements = $('link[href]').toArray();
    for (const el of linkElements) {
      const rel = $(el).attr('rel') || '';
      if (rel.includes('icon') || rel.includes('apple-touch')) {
        const href = $(el).attr('href');
        if (!href) continue;
        const absoluteUrl = resolveUrl(baseUrl, href);
        if (!absoluteUrl || absoluteUrl.startsWith('data:')) continue;
        
        if (!assetMap.has(absoluteUrl)) {
          const stored = await downloadAndStore(absoluteUrl, pageId, counter.n++);
          if (stored) {
            assetMap.set(absoluteUrl, stored);
            $(el).attr('href', stored);
          }
        }
      }
    }

    // 10. Processar background-image inline styles
    $('[style]').each((_, el) => {
      const style = $(el).attr('style') || '';
      if (style.includes('url(')) {
        // Reescrever URLs no inline style (apenas se já temos no mapa)
        let newStyle = style;
        assetMap.forEach((storedUrl, originalUrl) => {
          // Tentar encontrar a URL original no style
          const originalPath = new URL(originalUrl).pathname;
          if (newStyle.includes(originalPath)) {
            newStyle = newStyle.replace(new RegExp(originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), storedUrl);
          }
        });
        $(el).attr('style', newStyle);
      }
    });

    // 11. Remover scripts anti-clone
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      if (content.includes('debugger') || content.includes('anti-clone') || content.includes('devtool')) {
        $(el).remove();
      }
    });

    // 12. Adicionar <base> tag para resolver links restantes
    $('head').prepend(`<base href="${origin}/">`);

    // 13. Gerar HTML final
    const finalHtml = $.html();

    // 14. Salvar no banco
    const { data: pageData, error: dbError } = await supabaseAdmin
      .from('cloned_pages')
      .insert({
        id: pageId,
        name: pageTitle,
        original_url: url,
        html_content: finalHtml,
        assets: Object.fromEntries(assetMap),
        config: {},
      })
      .select()
      .single();

    if (dbError) {
      // Se a tabela não existir, criar automaticamente via RPC ou retornar erro útil
      if (dbError.message.includes('does not exist') || dbError.code === '42P01') {
        throw new Error('A tabela "cloned_pages" ainda não foi criada no Supabase. Execute a migration SQL no painel do Supabase.');
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      page: pageData,
      stats: {
        assetsDownloaded: assetMap.size,
        htmlSize: finalHtml.length,
      },
      message: `Página clonada com sucesso! ${assetMap.size} assets baixados.`,
    });

  } catch (error: any) {
    console.error('Page Clone Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao clonar a página' },
      { status: 500 }
    );
  }
}
