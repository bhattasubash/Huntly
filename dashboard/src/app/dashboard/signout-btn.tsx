'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Failed to sign out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id="dashboard-logout-btn"
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full py-2.5 bg-secondary hover:bg-destructive/15 hover:text-destructive border border-border rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      <span>{loading ? 'Signing Out...' : 'Sign Out'}</span>
    </button>
  );
}
