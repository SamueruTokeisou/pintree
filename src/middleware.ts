import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicPath = path === '/login' || path.startsWith('/api/auth/') || path === '/robots.txt' || path === '/nav-icon.svg' || path.startsWith('/favicon/');
  let response: NextResponse | undefined;
  if (!publicPath) {
    const secret = process.env.NEXTAUTH_SECRET || (process.env.ADMIN_PASSWORD ? 'samueru-private-v1:' + process.env.ADMIN_PASSWORD : undefined);
    const token = secret ? await getToken({ req: request, secret }) : null;
    if (!token) {
      response = path.startsWith('/api/')
        ? NextResponse.json({ error: '请先登录' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', request.url));
    }
  }
  response ??= NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
