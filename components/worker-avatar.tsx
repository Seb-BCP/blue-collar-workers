'use client';

import { useState } from 'react';

type WorkerAvatarProps = {
  name: string;
  photoUrl: string | null;
  hasPhotoSource: boolean;
  photoSigningError: string | null;
  compact?: boolean;
};

export function WorkerAvatar({
  name,
  photoUrl,
  hasPhotoSource,
  photoSigningError,
  compact = false,
}: WorkerAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className="avatar"
      data-compact={compact || undefined}
      aria-label={`${name} avatar`}
    >
      {photoUrl && !imageFailed ? (
        // A short-lived URL is generated server-side after the authorised RPC
        // returns this worker. No storage path is accepted from the browser.
        // A signed image should not be cached or routed through an image
        // optimiser that might outlive its short-lived authorisation.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          onError={() => {
            // The URL itself is intentionally not logged because it contains
            // the temporary Storage signature. Server logs show whether
            // signing succeeded; this identifies a later image-load failure.
            console.error('Authorised worker photo failed to load in the browser.', {
              workerName: name,
              reason: 'The signed image request was rejected or could not render.',
            });
            setImageFailed(true);
          }}
        />
      ) : hasPhotoSource ? (
        <span
          className="avatar-photo-error"
          aria-label={
            photoSigningError
              ? `Worker photo unavailable: ${photoSigningError}`
              : 'Worker photo unavailable: signed image could not be loaded.'
          }
          title={
            photoSigningError
              ? `Worker photo unavailable: ${photoSigningError}`
              : 'Worker photo unavailable: signed image could not be loaded.'
          }
        >
          !
        </span>
      ) : (
        <span aria-hidden="true">{initials || '—'}</span>
      )}
    </span>
  );
}
