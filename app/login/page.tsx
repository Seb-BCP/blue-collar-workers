import { redirect } from 'next/navigation';
import { Brand } from '@/components/brand';
import { ConfigurationRequired } from '@/components/configuration-required';
import { LoginForm } from '@/components/login-form';
import { isSupabaseConfigured } from '@/lib/env';
import { isDevelopmentPreview } from '@/lib/development-preview';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (isDevelopmentPreview()) redirect('/portal');

  if (!isSupabaseConfigured()) return <ConfigurationRequired />;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/portal');

  const params = await searchParams;
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <Brand />
        <p className="eyebrow">Client portal</p>
        <h1 id="login-title">Your team, clearly in view.</h1>
        <p>
          Enter your work email and we’ll send a secure sign-in link. No password
          needed.
        </p>
        <LoginForm callbackError={params.error ?? null} />
        <p className="auth-footnote">
          This is a read-only view of workers assigned to your organisation.
        </p>
      </section>
    </main>
  );
}
