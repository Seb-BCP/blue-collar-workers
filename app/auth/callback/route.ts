import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeInternalPath } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const OTP_TYPES = new Set<EmailOtpType>([
  'email',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const requestedType = requestUrl.searchParams.get('type');
  const next = safeInternalPath(requestUrl.searchParams.get('next'));

  try {
    const supabase = await createSupabaseServerClient();
    const error = code
      ? (await supabase.auth.exchangeCodeForSession(code)).error
      : tokenHash && requestedType && OTP_TYPES.has(requestedType as EmailOtpType)
        ? (
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: requestedType as EmailOtpType,
            })
          ).error
        : new Error('A valid sign-in code was not supplied.');

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  } catch {
    // Keep errors generic: auth tokens and callback parameters must never be logged.
  }

  return NextResponse.redirect(
    new URL('/login?error=Your+sign-in+link+is+invalid+or+has+expired.', requestUrl.origin),
  );
}
