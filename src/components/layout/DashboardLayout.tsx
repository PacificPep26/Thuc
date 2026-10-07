'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Menu, Users, ListChecks, Plane, Wallet, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from './NotificationBell';

const navItems = [
  { to: '/students', label: 'Học sinh', icon: Users },
  { to: '/travelers', label: 'Du lịch', icon: Plane },
  { to: '/templates', label: 'Mẫu quy trình', icon: ListChecks },
  { to: '/email-templates', label: 'Mẫu email', icon: Mail },
  { to: '/salary', label: 'Lương', icon: Wallet },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh bg-background p-3 sm:p-4">
      <aside
        className={cn(
          'neu-scope-sidebar neu-raised-lg fixed inset-y-3 left-3 z-40 flex w-60 shrink-0 -translate-x-[calc(100%+2rem)] flex-col rounded-3xl bg-(--sidebar-bg) p-4 text-(--sidebar-foreground) transition-transform',
          'lg:sticky lg:top-4 lg:h-[calc(100svh-2rem)] lg:translate-x-0',
          isMobileNavOpen && 'translate-x-0'
        )}
      >
        <div className="relative mb-6 flex flex-col items-center gap-2 px-1 pt-1">
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="neu-raised-sm absolute right-0 top-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-(--sidebar-muted) hover:text-(--sidebar-foreground) active:shadow-none lg:hidden"
          >
            <X size={18} />
          </button>
          <NotificationBell className="absolute left-0 top-0" />
          <Image
            src="/logo.jpg"
            alt="Gián Catholic Global"
            width={80}
            height={80}
            className="neu-raised-sm h-20 w-20 rounded-full object-cover"
          />
          <span className="text-center text-sm font-semibold leading-tight text-(--sidebar-foreground)">
            Gián Catholic
            <br />
            Global
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || pathname?.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                href={to}
                onClick={() => setIsMobileNavOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'neu-pressed-sm text-(--sidebar-active-bg)'
                    : 'text-(--sidebar-muted) hover:text-(--sidebar-foreground) hover:neu-raised-sm'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
                    isActive
                      ? 'bg-(--sidebar-active-bg) text-(--sidebar-active-foreground)'
                      : 'bg-transparent'
                  )}
                >
                  <Icon size={16} />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-4">
        <div className="neu-raised-sm mb-3 flex items-center gap-3 rounded-2xl bg-background px-4 py-3 lg:hidden">
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
          </button>
          <Image src="/logo.jpg" alt="Gián Catholic Global" width={36} height={36} className="rounded-full object-cover" />
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-card-foreground">Gián Catholic Global</span>
          <NotificationBell tone="light" />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-4">{children}</main>
      </div>
    </div>
  );
}
