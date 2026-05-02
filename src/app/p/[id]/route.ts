import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

/**
 * Page Proxy — Serve páginas clonadas via proxy reverso em tempo real
 * 
 * Mesma abordagem do God Mode v7 dos quizzes:
 * 1. Busca config no banco (checkout_url, pixel, custom_domain)
 * 2. Faz fetch LIVE do HTML original
 * 3. Processa com Cheerio (reescreve assets, injeta scripts)
 * 4. Retorna HTML modificado
 * 
 * Funciona com QUALQUER página — WordPress, React, Angular, estática, etc.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar página do banco
    const { data: page, error } = await supabaseAdmin
      .from('cloned_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !page || !page.original_url) {
      return new NextResponse('<h1>Página não encontrada</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const config = page.config || {};
    const originalUrl = page.original_url;

    // 2. Fetch LIVE do HTML original
    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return new NextResponse(`<h1>Erro ao acessar o site original (${response.status})</h1>`, {
        status: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const htmlBuffer = await response.arrayBuffer();
    const rawHtml = new TextDecoder('utf-8').decode(htmlBuffer);

    // 3. Parse com Cheerio
    const $ = cheerio.load(rawHtml);
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;

    // ═══════════════════════════════════════════════
    // PROXY ENGINE — Injetar scripts de proxy no <head>
    // ═══════════════════════════════════════════════

    const proxyScript = `
      <script id="page-proxy-engine">
        console.log("SnapFunnel Page Proxy Engine Ativo");
        
        // HACK 1: Enganar verificações de domínio
        try { window.history.replaceState(null, '', '/'); } catch(e) {}

        const proxyUrl = '/api/proxy?url=';
        const targetBaseUrl = '${baseUrl}';

        // HACK 2: Proxy de Fetch
        const _origFetch = window.fetch;
        window.fetch = async function() {
          let [resource, config] = arguments;
          if (typeof resource === 'string') {
            if (resource.startsWith('/')) {
              resource = proxyUrl + encodeURIComponent(targetBaseUrl + resource);
            } else if (resource.startsWith(targetBaseUrl)) {
              resource = proxyUrl + encodeURIComponent(resource);
            }
          } else if (resource instanceof Request) {
            const urlObj = new URL(resource.url, window.location.origin);
            if (urlObj.origin === window.location.origin && urlObj.pathname.startsWith('/')) {
              resource = new Request(proxyUrl + encodeURIComponent(targetBaseUrl + urlObj.pathname + urlObj.search), resource);
            } else if (urlObj.href.startsWith(targetBaseUrl)) {
              resource = new Request(proxyUrl + encodeURIComponent(resource.url), resource);
            }
          }
          return _origFetch.call(this, resource, config);
        };

        // HACK 3: Proxy de XHR
        const _origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
          if (typeof url === 'string') {
            if (url.startsWith('/')) {
              url = proxyUrl + encodeURIComponent(targetBaseUrl + url);
            } else if (url.startsWith(targetBaseUrl)) {
              url = proxyUrl + encodeURIComponent(url);
            }
          }
          return _origOpen.call(this, method, url, async, user, password);
        };
      </script>
    `;
    $('head').prepend(proxyScript);

    // ═══════════════════════════════════════════════
    // FIX ASSETS — Corrigir URLs relativas → absolutas
    // ═══════════════════════════════════════════════

    $('[src^="/"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('//')) {
        $(el).attr('src', baseUrl + src);
      }
    });
    $('[href^="/"]').each((_, el) => {
      const href = $(el).attr('href');
      const rel = $(el).attr('rel') || '';
      if (href && !href.startsWith('//')) {
        // Não reescrever links de navegação internos (anchor links)
        if (rel.includes('stylesheet') || rel.includes('icon') || rel.includes('preload') || rel.includes('preconnect')) {
          $(el).attr('href', baseUrl + href);
        } else if ($(el).prop('tagName') === 'LINK') {
          $(el).attr('href', baseUrl + href);
        }
      }
    });
    $('[srcset]').each((_, el) => {
      let srcset = $(el).attr('srcset');
      if (srcset) {
        srcset = srcset.split(',').map(s => {
          let parts = s.trim().split(' ');
          if (parts[0].startsWith('/') && !parts[0].startsWith('//')) {
            parts[0] = baseUrl + parts[0];
          }
          return parts.join(' ');
        }).join(', ');
        $(el).attr('srcset', srcset);
      }
    });

    // Fix background-image inline styles com URLs relativas
    $('[style]').each((_, el) => {
      const style = $(el).attr('style') || '';
      if (style.includes('url(/')) {
        const fixed = style.replace(/url\(\s*['"]?\//g, `url('${baseUrl}/`);
        $(el).attr('style', fixed);
      }
    });

    // ═══════════════════════════════════════════════
    // PROXY JS FILES — Reescrever src de scripts para proxy
    // ═══════════════════════════════════════════════

    $('script[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      // Remover scripts anti-clone
      if (src.includes('anti-clone') || src.includes('devtool')) {
        $(el).remove();
        return;
      }
      // Scripts do mesmo domínio: usar proxy para evitar CORS
      if (src.startsWith(baseUrl) || (src.startsWith('/') && !src.startsWith('//'))) {
        const fullUrl = src.startsWith('/') ? baseUrl + src : src;
        $(el).attr('src', `/api/proxy?url=${encodeURIComponent(fullUrl)}`);
      }
    });

    // Remover scripts anti-clone inline
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      if (content.includes('debugger') || content.includes('anti-clone') || content.includes('devtool-detect')) {
        $(el).remove();
      }
    });

    // ═══════════════════════════════════════════════
    // CHECKOUT INTERCEPTION — Redirecionar compras
    // ═══════════════════════════════════════════════

    if (config.checkout_url) {
      const checkoutScript = `
        <script id="page-checkout-interceptor">
        (function() {
          const CHECKOUT_URL = '${config.checkout_url}';
          
          // Capturar UTMs
          const params = new URLSearchParams(window.location.search);
          const utms = {};
          ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck'].forEach(function(p) {
            if (params.get(p)) utms[p] = params.get(p);
          });

          function buildUrl() {
            const u = new URL(CHECKOUT_URL);
            Object.entries(utms).forEach(function([k,v]) { u.searchParams.set(k, v); });
            return u.toString();
          }

          // Interceptar todos os cliques em links/botões de compra
          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link) {
              const href = (link.getAttribute('href') || '').toLowerCase();
              if (
                href.includes('checkout') || href.includes('pay') || href.includes('comprar') ||
                href.includes('hotmart') || href.includes('eduzz') || href.includes('monetizze') ||
                href.includes('kiwify') || href.includes('braip') || href.includes('lastlink') ||
                href.includes('greenn') || href.includes('pepper') ||
                link.dataset.checkout
              ) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = buildUrl();
                return;
              }
            }

            const btn = e.target.closest('button');
            if (btn) {
              const text = (btn.textContent || '').toLowerCase();
              if (
                text.includes('comprar') || text.includes('adquirir') || text.includes('garantir') ||
                text.includes('quero') || text.includes('assinar') || text.includes('matricular') ||
                text.includes('inscrever') || text.includes('buy') ||
                btn.dataset.checkout
              ) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = buildUrl();
              }
            }
          }, true);
        })();
        </script>
      `;
      $('body').append(checkoutScript);
    }

    // ═══════════════════════════════════════════════
    // PIXEL & SCRIPTS — Injetar rastreamento
    // ═══════════════════════════════════════════════

    if (config.pixel_script) {
      $('head').append(config.pixel_script);
    }
    if (config.head_scripts) {
      $('head').append(config.head_scripts);
    }
    if (config.body_scripts) {
      $('body').append(config.body_scripts);
    }

    // ═══════════════════════════════════════════════
    // RETORNAR HTML FINAL
    // ═══════════════════════════════════════════════

    const finalHtml = $.html();

    return new NextResponse(finalHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=30, s-maxage=120',
        'X-Powered-By': 'SnapFunnel Page Proxy',
      },
    });

  } catch (error: any) {
    console.error('Page Proxy Error:', error);
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h1>Erro ao carregar a página</h1>
        <p style="color:#666;">${error.message || 'Erro interno'}</p>
        <a href="/" style="color:#7c3aed;">Voltar ao painel</a>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
