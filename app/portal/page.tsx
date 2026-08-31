import { redirect } from 'next/navigation';
import { ClientPortal } from '@/components/client-portal';
import { ConfigurationRequired } from '@/components/configuration-required';
import { LogoutButton } from '@/components/logout-button';
import {
  groupClientWorkers,
  readClientWorkerCalendarRows,
  withSignedPhotoUrls,
} from '@/lib/client-workers';
import {
  clientDisplayName,
  hasAdminPreviewAccess,
  hasAuthorisedClientAccess,
} from '@/lib/auth';
import { businessTodayKey } from '@/lib/business-date';
import {
  getDevelopmentPreviewWorkers,
  developmentPreviewClientName,
  isDevelopmentPreview,
} from '@/lib/development-preview';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signAuthorisedWorkerPhotos } from '@/lib/worker-photos';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PortalPage() {
  if (isDevelopmentPreview()) {
    return (
      <ClientPortal
        workers={getDevelopmentPreviewWorkers()}
        clientName={developmentPreviewClientName}
        initialBusinessDate={businessTodayKey()}
        mode="development-preview"
      />
    );
  }

  if (!isSupabaseConfigured()) return <ConfigurationRequired />;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  if (hasAdminPreviewAccess(user)) {
    return (
      <ClientPortal
        workers={getDevelopmentPreviewWorkers()}
        clientName="Admin"
        title="Admin preview"
        userEmail={user.email ?? 'Signed-in admin'}
        initialBusinessDate={businessTodayKey()}
        mode="admin-preview"
      />
    );
  }

  if (!hasAuthorisedClientAccess(user)) {
    return <NoClientAccess />;
  }

  // Deliberately no client_id or other parameter: the RPC derives client scope
  // from the authenticated Supabase JWT.
  const { data, error } = await supabase.rpc('get_client_worker_calendar');

  if (error) return <WorkforceUnavailable />;

  const workerRecords = groupClientWorkers(readClientWorkerCalendarRows(data));
  const signedPhotoUrls = await signAuthorisedWorkerPhotos(supabase, workerRecords);
  const workers = withSignedPhotoUrls(workerRecords, signedPhotoUrls);

  return (
    <ClientPortal
      workers={workers}
      clientName={clientDisplayName(user)}
      userEmail={user.email ?? 'Signed-in client'}
      initialBusinessDate={businessTodayKey()}
      mode="authenticated"
    />
  );
}

function NoClientAccess() {
  return (
    <main className="auth-shell">
      <section className="notice-card" aria-labelledby="access-title">
        <div className="notice-icon notice-icon--warning" aria-hidden="true">
          !
        </div>
        <h1 id="access-title">Client access is not available</h1>
        <p>
          Your account is signed in, but it has not been linked to a client
          organisation. Please contact Blue Collar People for access.
        </p>
        <LogoutButton />
      </section>
    </main>
  );
}

function WorkforceUnavailable() {
  return (
    <main className="auth-shell">
      <section className="notice-card" aria-labelledby="unavailable-title">
        <div className="notice-icon notice-icon--warning" aria-hidden="true">
          !
        </div>
        <h1 id="unavailable-title">We can’t load your workforce right now</h1>
        <p>
          Please try again shortly. If this continues, contact Blue Collar
          People for help.
        </p>
      </section>
    </main>
  );
}
