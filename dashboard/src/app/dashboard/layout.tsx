import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import Link from 'next/link';
import SidebarNav from './sidebar-nav';
import SignOutButton from './signout-btn';

export const revalidate = 0; // Disable caching for the layout to ensure auth checks are fresh

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSideClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-border shrink-0 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-border/50 flex items-center">
            <img src="/huntly_logo.png" alt="Huntly Logo" className="h-[68px] w-[102px]" />
          </div>

          {/* Navigation Links */}
          <div className="p-4">
            <SidebarNav />
          </div>
        </div>

        {/* User profile details + logout */}
        <div className="p-4 border-t border-border/50 flex flex-col gap-3">
          <div className="flex flex-col px-3 py-2 bg-secondary/30 rounded-xl border border-border/30 overflow-hidden">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Logged In As</span>
            <span className="text-sm font-semibold text-white truncate" title={user.email}>
              {user.email}
            </span>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-8 bg-card/10 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white tracking-tight" id="dashboard-header-title">
            Dashboard Workspace
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Listening Active
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-[#030712]/30 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
