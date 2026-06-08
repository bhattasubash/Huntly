import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Middleware: Supabase environment variables are missing.");
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Get user session safely
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Route protection
    const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
    const isLoginRoute = request.nextUrl.pathname.startsWith('/login');

    if (!user && isDashboardRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user && isLoginRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (error) {
    console.error("Middleware execution failed:", error);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
