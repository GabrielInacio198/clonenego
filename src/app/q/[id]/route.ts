import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params?.id;

  if (!id) return new NextResponse('ID missing', { status: 400 });

  const { data: quiz } = await supabaseAdmin
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single();

  if (!quiz) return new NextResponse('Quiz não encontrado', { status: 404 });

  const originalUrl = quiz.original_url;
  const themeConfig = quiz.theme_config || {};
  const replacements = themeConfig.replacements || {};
  const userCheckoutUrl = replacements['__CHECKOUT_URL__'] || '';

  try {
    const baseUrlObj = new URL(originalUrl);
    const baseUrl = baseUrlObj.origin;

    const response = await fetch(originalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    let html = await response.text();
    const $ = cheerio.load(html);

    // 🛡️ O MOTOR "GOD SANDBOX" v23.0 (Baseado no Seca Jejum)
    const godSandbox = `
      <script id="god-mode-v23">
        (function() {
          console.log("SnapFunnel God Sandbox v23 Ativado");
          
          const proxyUrl = '/api/proxy?overrideHost=${encodeURIComponent(baseUrlObj.hostname)}&url=';
          const targetBaseUrl = '${baseUrl}';

          // 1. Proxy de FETCH (Cérebro do site)
          const _origFetch = window.fetch;
          window.fetch = async function(resource, config) {
            if (typeof resource === 'string' && (resource.startsWith('/') || resource.includes(targetBaseUrl))) {
               const absoluteUrl = resource.startsWith('/') ? targetBaseUrl + resource : resource;
               resource = proxyUrl + encodeURIComponent(absoluteUrl);
            }
            return _origFetch.call(this, resource, config);
          };

          // 2. Proxy de XHR (Corpo do site)
          const _origOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string' && (url.startsWith('/') || url.includes(targetBaseUrl))) {
               const absoluteUrl = url.startsWith('/') ? targetBaseUrl + url : url;
               arguments[1] = proxyUrl + encodeURIComponent(absoluteUrl);
            }
            return _origOpen.apply(this, arguments);
          };

          // 3. Neutralizador de Histórico
          const noop = () => {};
          window.history.pushState = noop;
          window.history.replaceState = noop;

          // 4. Interceptor de Checkout
          const CHECKOUT = ${JSON.stringify(userCheckoutUrl)};
          document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button, [role="button"]');
            if (!target) return;
            const href = target.getAttribute('href') || '';
            const text = target.textContent?.toLowerCase() || '';
            if ((href.includes('hotmart') || href.includes('checkout') || href.includes('pay.')) && CHECKOUT) {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = CHECKOUT + window.location.search;
            }
          }, true);
        })();
      </script>
    `;

    $('head').prepend(`<base href="${baseUrl}/">`);
    $('head').prepend(godSandbox);
    $('head').append(`<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer></script>`);

    if (themeConfig.head_scripts) $('head').append(themeConfig.head_scripts);
    if (themeConfig.body_scripts) $('body').append(themeConfig.body_scripts);

    // Registrar visualização
    supabaseAdmin.from('quiz_views').insert([{ quiz_id: id }]).then(() => {});

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL'
      },
    });

  } catch (err: any) {
    return new NextResponse(`<iframe src="${originalUrl}" style="border:none;width:100%;height:100%;"></iframe>`, { headers: { 'Content-Type': 'text/html' } });
  }
}
