'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppNotification {
  id: string;
  title: string;
  detail?: string;
  at: string;
  read: boolean;
}

// Placeholder until notifications exist: later this reads the real list (interview within 48h, visa expiring,
// update due, mail bounced…) and the badge/panel below light up without further layout work.
function useNotifications(): { items: AppNotification[]; unread: number } {
  const items: AppNotification[] = [];
  return { items, unread: items.filter((n) => !n.read).length };
}

const PANEL_WIDTH = 320;

export function NotificationBell({ className, tone = 'sidebar' }: { className?: string; tone?: 'sidebar' | 'light' }) {
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const wide = window.innerWidth >= 1024;
    // Desktop: open to the right of the sidebar button; narrow screens: centred under it, kept on screen.
    const sidebarRight = buttonRef.current?.closest('aside')?.getBoundingClientRect().right;
    const left = wide ? (sidebarRight ?? rect.right) + 12 : Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8));
    setPos({ top: wide ? Math.max(8, rect.top) : rect.bottom + 8, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition',
          tone === 'sidebar'
            ? 'neu-raised-sm text-(--sidebar-muted) hover:text-(--sidebar-foreground) active:shadow-none'
            : 'text-muted-foreground hover:text-foreground',
          className
        )}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Thông báo"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
            className="fixed z-[60] max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Thông báo</h2>
              {unread > 0 && <span className="text-xs text-muted-foreground">{unread} chưa đọc</span>}
            </div>
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Bell size={26} className="text-muted-foreground/60" />
                <p className="text-sm font-medium">Chưa có thông báo</p>
                <p className="text-xs text-muted-foreground">Lịch phỏng vấn sắp tới, visa sắp hết hạn và thư gửi lỗi sẽ hiện ở đây.</p>
              </div>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id} className={cn('border-b border-border px-4 py-3 last:border-0', !n.read && 'bg-primary/5')}>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.detail && <p className="text-xs text-muted-foreground">{n.detail}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{n.at}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
