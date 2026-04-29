import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteger apenas o dashboard
  if (pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('admin_auth')?.value;
    const adminSecret = process.env.ADMIN_SECRET || 'admin123';

    if (authCookie !== adminSecret) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
