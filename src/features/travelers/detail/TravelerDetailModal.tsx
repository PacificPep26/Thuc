'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, X } from 'lucide-react';
import { travelerApi } from '../traveler.api';
import { ProfileTab } from './ProfileTab';
import { NotesTab } from './NotesTab';
import { DocumentsTab } from './DocumentsTab';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'profile', label: 'Hồ sơ' },
  { key: 'documents', label: 'Tài liệu' },
  { key: 'notes', label: 'Ghi chú' },
] as const;

export type TravelerDetailTabKey = (typeof TABS)[number]['key'];

interface TravelerDetailModalProps {
  travelerId: string | null;
  initialTab?: TravelerDetailTabKey;
  onOpenChange: (open: boolean) => void;
}

export function TravelerDetailModal({ travelerId, initialTab, onOpenChange }: TravelerDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TravelerDetailTabKey>(initialTab ?? 'profile');

  useEffect(() => {
    if (travelerId) {
      setActiveTab(initialTab ?? 'profile');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelerId, initialTab]);

  const { data: traveler, isLoading } = useQuery({
    queryKey: ['traveler', travelerId],
    queryFn: () => travelerApi.getById(travelerId as string),
    enabled: Boolean(travelerId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => travelerApi.remove(travelerId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelers'] });
      onOpenChange(false);
    },
  });

  function handleDelete() {
    if (confirm(`Xóa hồ sơ "${traveler?.personal.fullName ?? ''}"? Hành động này không thể hoàn tác.`)) {
      deleteMutation.mutate();
    }
  }

  return (
    <Dialog.Root open={Boolean(travelerId)} onOpenChange={(next) => !next && onOpenChange(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-dvh w-screen -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-border bg-card shadow-lg sm:h-[85vh] sm:w-[92vw] sm:max-w-3xl sm:rounded-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            <Dialog.Title className="truncate text-base font-semibold text-card-foreground sm:text-lg">
              {traveler?.personal.fullName ?? 'Hồ sơ du lịch'}
            </Dialog.Title>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={!traveler || deleteMutation.isPending}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-500 disabled:opacity-50"
                title="Xóa hồ sơ"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Xóa</span>
              </button>
              <Dialog.Close className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </Dialog.Close>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-1.5 sm:p-3 no-scrollbar sm:w-44 sm:flex-col sm:border-b-0 sm:border-r">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium transition',
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isLoading && <p className="text-sm text-muted-foreground">Đang tải thông tin…</p>}
              {traveler && (
                <>
                  {activeTab === 'profile' && <ProfileTab traveler={traveler} />}
                  {activeTab === 'notes' && <NotesTab traveler={traveler} />}
                  {activeTab === 'documents' && <DocumentsTab travelerId={traveler.id} />}
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
