import { NextRequest, NextResponse } from 'next/server';
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/'))
    return NextResponse.json({ error: 'Reader only' }, { status: 404 });
  const response = NextResponse.next();
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)'],
};
