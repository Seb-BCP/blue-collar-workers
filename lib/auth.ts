import 'server-only';

import type { User } from '@supabase/supabase-js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADMIN_PREVIEW_EMAIL = 'sebastian@bluecollarpeople.com';

export function hasAuthorisedClientAccess(user: User): boolean {
  const clientId = user.app_metadata.client_id;
  return typeof clientId === 'string' && UUID_PATTERN.test(clientId);
}

/**
 * This is deliberately a UI-only preview role. It must match both the exact
 * email and server-controlled app metadata, and never widens workforce data
 * access or the client-scoped RPC.
 */
export function hasAdminPreviewAccess(user: User): boolean {
  return (
    user.email?.trim().toLowerCase() === ADMIN_PREVIEW_EMAIL &&
    user.app_metadata.bcp_portal_preview === true
  );
}

/**
 * Client-facing wording is optional metadata only; access control always uses
 * the protected client_id above. The fallback avoids displaying an internal ID.
 */
export function clientDisplayName(user: User): string {
  const value = user.app_metadata.client_name;
  return typeof value === 'string' && value.trim() ? value.trim() : 'Client';
}

export function safeInternalPath(value: string | null, fallback = '/portal') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;

  try {
    const url = new URL(value, 'https://portal.local');
    return url.origin === 'https://portal.local'
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
