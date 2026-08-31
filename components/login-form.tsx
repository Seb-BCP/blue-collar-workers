'use client';

import { type FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type LoginFormProps = {
  callbackError: string | null;
};

export function LoginForm({ callbackError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage('Incorrect email address or password. Please try again.');
        return;
      }

      window.location.assign('/portal');
    } catch {
      setMessage('We could not sign you in. Please try again shortly.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={signIn}>
      {callbackError ? <p className="form-message">{callbackError}</p> : null}
      {message ? (
        <p
          className="form-message"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
      <label className="field-label" htmlFor="email">
        Email address
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
      <label className="field-label" htmlFor="password">
        Password
        <input
          className="text-input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </label>
      <button className="button button--primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
