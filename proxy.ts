import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getExpectedToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return btoa(`asknatural:${password}:session`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight for quiz endpoints immediately
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/quiz')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Allow public routes without auth
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/quiz') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    // Add CORS headers for public quiz API routes
    if (pathname.startsWith('/api/quiz')) {
      const response = NextResponse.next();
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return response;
    }
    return NextResponse.next();
  }

  // Check auth
  const session = request.cookies.get('admin_session')?.value;
  const expected = getExpectedToken();

  if (!expected || !session || session !== expected) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
