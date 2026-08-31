import { Brand } from '@/components/brand';

export function ConfigurationRequired() {
  return (
    <main className="auth-shell">
      <section className="notice-card" aria-labelledby="configuration-title">
        <Brand />
        <div className="notice-icon notice-icon--warning" aria-hidden="true">
          !
        </div>
        <h1 id="configuration-title">Portal setup is incomplete</h1>
        <p>
          This portal is not connected to its secure workforce service yet. An
          administrator needs to add the Supabase public URL and publishable key
          before clients can sign in.
        </p>
      </section>
    </main>
  );
}
