import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteger o dashboard e as rotas sensíveis de API (Criação, Edição, Deleção)
  const isProtectedPath = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/api/clone') || 
    pathname.startsWith('/api/quiz');

  if (isProtectedPath) {
    const authCookie = request.cookies.get('admin_auth')?.value;
    const adminSecret = process.env.ADMIN_SECRET || 'admin123';

    if (authCookie !== adminSecret) {
      // Se for uma rota de API, retorna 401 (Não Autorizado) para bloquear bots e hackers
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Acesso Negado: Tentativa de Invasão Bloqueada' }, { status: 401 });
      }
      // Se for página web, redireciona pro login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/clone/:path*', '/api/quiz/:path*'],
};
