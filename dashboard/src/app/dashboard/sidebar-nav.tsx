'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Flame, Send, FolderGit2, Settings } from 'lucide-react';

export default function SidebarNav() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/opportunities', label: 'Opportunities', icon: Flame },
    { href: '/dashboard/reply-queue', label: 'Reply Queue', icon: Send },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderGit2 },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="flex flex-col gap-1.5">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive =
          pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));

        return (
          <Link
            id={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}-link`}
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
              isActive
                ? 'bg-primary/20 text-white border-l-4 border-primary'
                : 'text-muted-foreground hover:bg-secondary/45 hover:text-white'
            }`}
          >
            <Icon
              className={`h-5 w-5 shrink-0 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-white'
              }`}
            />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
