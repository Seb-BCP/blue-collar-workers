'use client';

import { type FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type LoginFormProps = {
  callbackError: string | null;
};

export function LoginForm({ callbackError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', '/portal');

      const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: false,
        },
      });

      // This deliberately remains Supabase OTP-based rather than password-based.
      // When the email template and verification UI are ready, this request can
      // support a 6-digit email token without changing portal authorisation.

      if (error) {
        setMessage('We could not send a sign-in link. Check the address and try again.');
        return;
      }

      setMessage('Check your inbox for a secure sign-in link.');
    } catch {
      setMessage('We could not start sign-in. Please try again shortly.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={requestMagicLink}>
      {callbackError ? <p className="form-message">{callbackError}</p> : null}
      {message ? (
        <p
          className={`form-message${
            message.startsWith('Check your inbox') ? ' form-message--success' : ''
          }`}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
      <label className="field-label" htmlFor="email">
        Work email address
        <input
          className="text-input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </label>
      <button className="button button--primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending link…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}
