import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('admin_auth');

  // 1. Proteger rotas do Dashboard e APIs de Gerenciamento
  // Se tentar acessar /dashboard ou /api/quiz/* sem estar logado, redireciona/bloqueia
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/quiz') || pathname.startsWith('/api/auth/admins')) {
    if (!authCookie) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/quiz/:path*',
    '/api/auth/admins/:path*',
  ],
};
