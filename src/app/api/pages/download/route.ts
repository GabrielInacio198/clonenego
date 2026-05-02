import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import JSZip from 'jszip';

/**
 * Gera e retorna um arquivo ZIP com a página clonada e todos os assets.
 * O HTML é reescrito para usar caminhos relativos (./assets/...)
 * para que o ZIP funcione em qualquer host.
 */
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

    const zip = new JSZip();
    let html = page.html_content || '';
    const assets = page.assets || {};
    const config = page.config || {};
    const assetsFolder = zip.folder('assets')!;

    // 2. Baixar cada asset e adicionar ao ZIP
    let assetIndex = 0;
    const urlToLocalPath: Map<string, string> = new Map();

    for (const [originalUrl, storedUrl] of Object.entries(assets)) {
      try {
        const res = await fetch(storedUrl as string, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) continue;

        const buffer = await res.arrayBuffer();
        
        // Determinar nome do arquivo
        let fileName: string;
        try {
          const urlObj = new URL(originalUrl);
          fileName = urlObj.pathname.split('/').pop() || `asset_${assetIndex}`;
          // Limpar nome
          fileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
        } catch {
          fileName = `asset_${assetIndex}.bin`;
        }

        // Evitar nomes duplicados
        if (urlToLocalPath.has(fileName)) {
          fileName = `${assetIndex}_${fileName}`;
        }

        const localPath = `assets/${fileName}`;
        assetsFolder.file(fileName, buffer);
        urlToLocalPath.set(storedUrl as string, localPath);
        
        assetIndex++;
      } catch (err) {
        console.error(`Failed to download asset for ZIP:`, err);
      }
    }

    // 3. Reescrever URLs no HTML para caminhos relativos
    urlToLocalPath.forEach((localPath, storedUrl) => {
      html = html.split(storedUrl).join(`./${localPath}`);
    });

    // 4. Injetar pixel/checkout se configurados
    if (config.pixel_script) {
      html = html.replace('</head>', `${config.pixel_script}\n</head>`);
    }
    if (config.checkout_url) {
      // Adicionar script que redireciona botões de compra
      const checkoutScript = `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href*="checkout"], a[href*="pay"], button[data-checkout]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '${config.checkout_url}';
      });
    });
  });
</script>`;
      html = html.replace('</body>', `${checkoutScript}\n</body>`);
    }

    // 5. Adicionar ao ZIP
    zip.file('index.html', html);

    // 6. Adicionar README
    const readme = `# ${page.name}
Página clonada por SnapFunnel em ${new Date(page.created_at).toLocaleDateString('pt-BR')}

## Como usar
1. Extraia o ZIP em uma pasta
2. Faça upload dos arquivos para seu servidor/hosting
3. O arquivo principal é o index.html

## Editar links de checkout
Abra o index.html e procure por links de checkout para substituir.

## Origem
URL original: ${page.original_url}
`;
    zip.file('README.md', readme);

    // 7. Gerar o ZIP
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });

    // 8. Retornar como download
    const safeName = page.name.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50);
    
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
