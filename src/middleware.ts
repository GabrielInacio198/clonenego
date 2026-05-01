import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Definir rotas que PRECISAM de proteção
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/api/quiz') || 
    pathname.startsWith('/api/auth/admins');

  // 2. Definir rotas de exceção (Login e APIs de Auth)
  const isAuthRoute = 
    pathname === '/login' || 
    pathname.startsWith('/api/auth/login');

  if (isProtectedRoute && !isAuthRoute) {
    const adminSession = request.cookies.get('admin_session');

    if (!adminSession) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configurar o matcher para ser o mais restritivo possível
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/quiz/:path*',
    '/api/auth/admins/:path*',
  ],
};
