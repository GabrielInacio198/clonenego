import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('admin_auth');

  // 1. Proteger rotas do Dashboard e APIs de Gerenciamento
  // Se tentar acessar /dashboard ou /api/quiz/* sem estar logado, redireciona/bloqueia
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/quiz')) {
    if (!authCookie) {
      // Se for uma rota de API, retorna erro 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      // Se for uma página, redireciona para o login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// Configurar quais caminhos o middleware deve observar
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/quiz/:path*',
  ],
};
