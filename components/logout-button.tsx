'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } finally {
      window.location.assign('/login');
    }
  }

  return (
    <button
      className="button button--ghost"
      type="button"
      onClick={signOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
