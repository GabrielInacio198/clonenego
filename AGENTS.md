<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:snapfunnel-critical-rules -->
# 🚨 REGRAS CRÍTICAS DE PROTEÇÃO — SnapFunnel

## NUNCA simplificar ou reduzir estes arquivos:
- `src/app/q/[id]/route.ts` — God Mode v7 (proxy reverso dos funis). Se simplificado, TODOS os funis ficam em branco.
- `src/app/page.tsx` — Resolve domínio personalizado → quiz ID.
- `src/app/api/proxy/route.ts` — Proxy de assets/JS com rewrite de hostname.

## SEMPRE rodar `npx next build` antes de git push.
## NUNCA criar middleware.ts sem necessidade explícita.
## Para debug: adicionar console.error(), NÃO simplificar código.

Leia CLAUDE.md para regras detalhadas.
<!-- END:snapfunnel-critical-rules -->
