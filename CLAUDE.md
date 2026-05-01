# SnapFunnel — Regras Críticas para o AI

## 🚨 REGRA #1: NUNCA SIMPLIFICAR OU REDUZIR O ARQUIVO `src/app/q/[id]/route.ts`

Este arquivo é o **coração do sistema**. Ele contém o "God Mode v7" — o proxy reverso
que renderiza os funis clonados nos domínios personalizados. 

**Se este arquivo for simplificado, TODOS os funis ficam em branco (tela branca).**

### O que este arquivo FAZ (e que NUNCA pode ser removido):
1. **Cheerio HTML parsing** — carrega o HTML original e injeta scripts
2. **`window.QUIZ_REPLACEMENTS`** — dicionário de substituições (textos, imagens, links)
3. **Proxy de `fetch` e `XMLHttpRequest`** — redireciona chamadas de API do site original
4. **`MutationObserver`** — aplica substituições em conteúdo dinâmico (SPA)
5. **Interceptação de checkout** — redireciona cliques de compra para os links do dono do funil
6. **Correção de assets** — converte URLs relativas (`/img/foto.png`) para absolutas
7. **Remoção de anti-clone** — remove scripts de proteção do site original
8. **UTM forwarding** — preserva parâmetros de rastreamento nas URLs de checkout
9. **Scripts customizados** — injeta head_scripts e body_scripts do editor
10. **Proxy de JS** — reescreve `location.hostname` nos scripts para enganar verificações de domínio

### ⚠️ Se precisar debugar tela branca:
- **NUNCA** simplifique o route.ts. Em vez disso, adicione `console.error()` para debug.
- O problema geralmente é em OUTRO arquivo (middleware, login page, etc.).
- Faça `npx next build` ANTES de fazer commit para verificar erros de sintaxe.

---

## 🚨 REGRA #2: NUNCA FAZER COMMIT SEM BUILD LOCAL

Antes de qualquer `git push`, SEMPRE rodar:
```
npx next build
```
Se o build falhar, **NÃO faça push**. Corrija o erro primeiro.

---

## 🚨 REGRA #3: ARQUIVOS CRÍTICOS (NÃO SIMPLIFICAR)

| Arquivo | Função | Risco se quebrar |
|---------|--------|-----------------|
| `src/app/q/[id]/route.ts` | Renderiza funis nos domínios | **Todos os funis ficam em branco** |
| `src/app/page.tsx` | Resolve domínio → quiz ID | **Domínios personalizados param de funcionar** |
| `src/app/api/proxy/route.ts` | Proxy para assets e JS | **CSS/JS/imagens dos funis quebram** |
| `src/lib/supabase.ts` | Conexão com banco de dados | **Todo o sistema para** |
| `src/app/login/page.tsx` | Tela de login | **Build quebra se tiver erro de JSX** |

---

## 🚨 REGRA #4: MIDDLEWARE

Não criar middleware (`middleware.ts` na raiz ou em `src/`) a menos que seja 
explicitamente pedido. Middleware mal configurado já causou tela branca múltiplas vezes.

---

## 📋 REGRA #5: ANTES DE QUALQUER ALTERAÇÃO

1. Ler o arquivo completo que vai editar
2. Fazer a alteração cirúrgica (só o necessário)
3. Rodar `npx next build` para validar
4. Só então fazer commit e push

---

## 🏗️ Arquitetura Resumida

```
Domínio personalizado → page.tsx (resolve quiz ID) → /q/[id]/route.ts (God Mode v7)
                                                          ↓
                                                    Cheerio processa HTML
                                                          ↓
                                                    Injeta scripts + substituições
                                                          ↓
                                                    Retorna HTML modificado ao browser
```

## 📦 Stack
- **Next.js 16.2.4** (Turbopack)
- **Supabase** (banco + storage)
- **Cheerio** (parsing HTML server-side)
- **Vercel** (deploy automático via git push)
- **Domínios**: secajejum.online, jejumturbo.online, etc.
