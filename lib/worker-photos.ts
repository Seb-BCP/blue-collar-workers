import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  canDisplayPhoto,
  photoLocationKey,
  type ClientWorkerRecord,
} from '@/lib/client-workers';

const SIGNED_URL_TTL_SECONDS = 3600;

export type SignedWorkerPhotos = {
  urls: Map<string, string>;
  errors: Map<string, string>;
};

/**
 * Uses the authenticated user's own session, never a service-role key. The
 * worker list is already authorised by the RPC before any storage call occurs.
 */
export async function signAuthorisedWorkerPhotos(
  supabase: SupabaseClient,
  workers: ClientWorkerRecord[],
): Promise<SignedWorkerPhotos> {
  // This is deliberately checked immediately before the Storage request. It
  // verifies that the same server client has both the request session and its
  // access token; neither the token nor signed URLs are ever logged.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.info('Worker photo signing authentication context.', {
    sessionPresent: Boolean(session),
    accessTokenPresent: Boolean(session?.access_token),
    sessionUserId: session?.user.id ?? null,
    verifiedUserId: user?.id ?? null,
    sessionMatchesVerifiedUser: Boolean(
      session?.user.id && user?.id && session.user.id === user.id,
    ),
    sessionError: diagnosticError(sessionError),
    userError: diagnosticError(userError),
  });

  const uniquePhotos = new Map(
    workers
      .map((worker) => worker.photo)
      .filter(canDisplayPhoto)
      .map((photo) => [photoLocationKey(photo), photo]),
  );

  const signedPhotoResults = await Promise.all(
    [...uniquePhotos.entries()].map(async ([key, photo]) => {
      // These are the raw photo_bucket and photo_path values returned by the
      // authorised RPC. This log makes invisible differences (such as an
      // unwanted slash, whitespace, or encoding) apparent byte-for-byte.
      console.info('Worker photo signing request (raw RPC values).', {
        bucket: storageIdentifierForLog(photo.bucket),
        path: storageIdentifierForLog(photo.path),
        expiresIn: SIGNED_URL_TTL_SECONDS,
      });

      const { data, error } = await supabase.storage
        .from(photo.bucket)
        .createSignedUrl(photo.path, SIGNED_URL_TTL_SECONDS);

      if (error || !data?.signedUrl) {
        const message = error?.message ?? 'No signed URL returned';

        // Keep the complete Storage error in server logs for diagnosis. The
        // logged context excludes both the session JWT and the signed URL.
        console.error('Unable to sign an authorised worker photo.', {
          bucket: photo.bucket,
          path: photo.path,
          storageError: diagnosticError(error),
        });
        return { key, url: null, error: message } as const;
      }

      console.info('Authorised worker photo signed successfully.', {
        bucket: photo.bucket,
        path: photo.path,
        signedForVerifiedUser: Boolean(user?.id),
      });

      return { key, url: data.signedUrl, error: null } as const;
    }),
  );

  return {
    urls: new Map(
      signedPhotoResults
        .filter((result) => result.url !== null)
        .map((result) => [result.key, result.url] as const),
    ),
    errors: new Map(
      signedPhotoResults
        .filter((result) => result.error !== null)
        .map((result) => [result.key, result.error] as const),
    ),
  };
}

function diagnosticError(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== 'object') return null;

  const source = error as Record<string, unknown>;
  const fields = ['name', 'message', 'status', 'statusCode', 'code', 'error'];

  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  );
}

function storageIdentifierForLog(value: string) {
  return {
    // JSON representation preserves leading/trailing slashes and whitespace.
    value: JSON.stringify(value),
    codeUnitLength: value.length,
    utf8Hex: Array.from(new TextEncoder().encode(value), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(''),
  };
}
