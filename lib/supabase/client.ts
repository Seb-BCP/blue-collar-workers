'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseBrowserEnv } from '@/lib/env';

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const { url, anonKey } = getSupabaseBrowserEnv();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
