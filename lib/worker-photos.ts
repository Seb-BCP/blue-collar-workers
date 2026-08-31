import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  canDisplayPhoto,
  photoLocationKey,
  type ClientWorkerRecord,
} from '@/lib/client-workers';

const SIGNED_URL_TTL_SECONDS = 10 * 60;

/**
 * Uses the authenticated user's own session, never a service-role key. The
 * worker list is already authorised by the RPC before any storage call occurs.
 */
export async function signAuthorisedWorkerPhotos(
  supabase: SupabaseClient,
  workers: ClientWorkerRecord[],
): Promise<Map<string, string>> {
  const uniquePhotos = new Map(
    workers
      .map((worker) => worker.photo)
      .filter(canDisplayPhoto)
      .map((photo) => [photoLocationKey(photo), photo]),
  );

  const signedPhotoResults = await Promise.all(
    [...uniquePhotos.entries()].map(async ([key, photo]) => {
      const { data, error } = await supabase.storage
        .from(photo.bucket)
        .createSignedUrl(photo.path, SIGNED_URL_TTL_SECONDS);

      return !error && data?.signedUrl ? ([key, data.signedUrl] as const) : null;
    }),
  );

  return new Map(
    signedPhotoResults.filter(
      (result): result is readonly [string, string] => result !== null,
    ),
  );
}
