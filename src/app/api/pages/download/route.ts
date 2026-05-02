import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';
import JSZip from 'jszip';

/**
 * Gera um ZIP da página clonada — faz fetch LIVE da URL original,
 * converte assets relativos para absolutos, injeta checkout/pixel,
 * e empacota tudo num ZIP com index.html pronto para hospedar.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function GET(req: NextRequest) {
  try {
    const pageId = req.nextUrl.searchParams.get('id');
    if (!pageId) {
      return NextResponse.json({ error: 'ID da página é obrigatório' }, { status: 400 });
    }

    // 1. Buscar página do banco
    const { data: page, error } = await supabaseAdmin
      .from('cloned_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (error || !page) {
      return NextResponse.json({ error: 'Página não encontrada' }, { status: 404 });
    }

    const config = page.config || {};

    // 2. Fetch LIVE do HTML original
    const response = await fetch(page.original_url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Erro ao acessar o site original: ${response.status}` }, { status: 502 });
    }

    const rawHtml = new TextDecoder('utf-8').decode(await response.arrayBuffer());
    const $ = cheerio.load(rawHtml);
    const baseUrlObj = new URL(page.original_url);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;

    // 3. Converter todas as URLs relativas para absolutas
    $('[src^="/"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('//')) $(el).attr('src', baseUrl + src);
    });
    $('link[href^="/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('//')) $(el).attr('href', baseUrl + href);
    });
    $('[srcset]').each((_, el) => {
      let srcset = $(el).attr('srcset');
      if (srcset) {
        srcset = srcset.split(',').map(s => {
          let parts = s.trim().split(' ');
          if (parts[0].startsWith('/') && !parts[0].startsWith('//')) parts[0] = baseUrl + parts[0];
          return parts.join(' ');
        }).join(', ');
        $(el).attr('srcset', srcset);
      }
    });
    $('script[src^="/"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('//')) $(el).attr('src', baseUrl + src);
    });

    // 4. Remover anti-clone
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      const src = $(el).attr('src') || '';
      if (content.includes('debugger') || content.includes('anti-clone') || src.includes('anti-clone')) {
        $(el).remove();
      }
    });

    // 5. Injetar checkout
    if (config.checkout_url) {
      $('body').append(`
        <script>
        (function() {
          var CHECKOUT = '${config.checkout_url}';
          var p = new URLSearchParams(window.location.search);
          var u = {};
          ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck'].forEach(function(k) {
            if (p.get(k)) u[k] = p.get(k);
          });
          function go() {
            var url = new URL(CHECKOUT);
            Object.keys(u).forEach(function(k) { url.searchParams.set(k, u[k]); });
            window.location.href = url.toString();
          }
          document.addEventListener('click', function(e) {
            var a = e.target.closest('a');
            if (a) {
              var h = (a.getAttribute('href')||'').toLowerCase();
              if (h.includes('checkout')||h.includes('pay')||h.includes('comprar')||h.includes('hotmart')||h.includes('kiwify')||h.includes('eduzz')||h.includes('monetizze')||h.includes('braip')) {
                e.preventDefault(); go();
              }
            }
            var b = e.target.closest('button');
            if (b) {
              var t = (b.textContent||'').toLowerCase();
              if (t.includes('comprar')||t.includes('adquirir')||t.includes('garantir')||t.includes('quero')) {
                e.preventDefault(); go();
              }
            }
          }, true);
        })();
        </script>
      `);
    }

    // 6. Injetar pixel/scripts
    if (config.pixel_script) $('head').append(config.pixel_script);
    if (config.head_scripts) $('head').append(config.head_scripts);
    if (config.body_scripts) $('body').append(config.body_scripts);

    // 7. Adicionar <base> para resolver qualquer URL restante
    if ($('base').length === 0) {
      $('head').prepend(`<base href="${baseUrl}/">`);
    }

    const finalHtml = $.html();

    // 8. Gerar ZIP
    const zip = new JSZip();
    zip.file('index.html', finalHtml);
    zip.file('README.md', `# ${page.name}\nPágina clonada por SnapFunnel\nOriginal: ${page.original_url}\n\nAbra o index.html no navegador ou faça upload para seu hosting.\nOs assets são carregados diretamente do site original via <base> tag.`);

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });

    const safeName = (page.name || 'pagina').replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50);

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      },
    });

  } catch (error: any) {
    console.error('ZIP generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
