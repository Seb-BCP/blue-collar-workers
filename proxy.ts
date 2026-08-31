import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseBrowserEnv, isSupabaseConfigured } from '@/lib/env';

const RESPONSE_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return addSecurityHeaders(response);
  }

  const { url, anonKey } = getSupabaseBrowserEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not replace this with getSession(): getUser() verifies the token with
  // Supabase and lets @supabase/ssr refresh the browser cookies safely.
  await supabase.auth.getUser();
  return addSecurityHeaders(response);
}

function addSecurityHeaders(response: NextResponse) {
  Object.entries(RESPONSE_SECURITY_HEADERS).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
