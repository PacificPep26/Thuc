'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Pencil, Save, Trash2, X } from 'lucide-react';
import { dailyNoteApi } from './daily-note.api';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

export function DailyNotesHeader() {
  const today = localDateKey();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { data: notes = [], isLoading } = useQuery({ queryKey: ['daily-notes'], queryFn: () => dailyNoteApi.list('', '') });
  const noteByDate = useMemo(() => new Map(notes.map((note) => [note.date, note])), [notes]);
  const todayNote = noteByDate.get(today);
  const content = drafts[selectedDate] ?? noteByDate.get(selectedDate)?.content ?? '';

  const saveMutation = useMutation({
    mutationFn: () => dailyNoteApi.save(selectedDate, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily-notes'] });
      setDrafts((current) => {
        const next = { ...current };
        delete next[selectedDate];
        return next;
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => dailyNoteApi.remove(selectedDate),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily-notes'] });
      setDrafts((current) => ({ ...current, [selectedDate]: '' }));
    },
  });

  const upcoming = notes.filter((note) => note.date >= today).slice(0, 8);

  function openDate(date: string) {
    setSelectedDate(date);
    setOpen(true);
  }

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center justify-center sm:px-3">
        {todayNote ? (
          <button
            type="button"
            onClick={() => openDate(today)}
            className="flex max-w-full items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950 hover:bg-amber-100"
            title="Chỉnh sửa ghi chú hôm nay"
          >
            <CalendarDays size={17} className="shrink-0 text-amber-600" />
            <span className="min-w-0 line-clamp-3 whitespace-pre-line break-words"><strong>Hôm nay:</strong> {todayNote.content}</span>
            <Pencil size={14} className="shrink-0 opacity-60" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openDate(today)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <CalendarDays size={16} /> Ghi chú theo ngày
          </button>
        )}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:inset-4">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <Dialog.Title className="font-semibold">Lịch ghi chú</Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">Ghi chú của đúng ngày sẽ hiện trên header trong ngày đó.</Dialog.Description>
              </div>
              <Dialog.Close aria-label="Đóng"><X size={19} /></Dialog.Close>
            </div>
            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[260px_1fr] md:overflow-hidden">
              <aside className="border-b border-border p-4 md:overflow-y-auto md:border-b-0 md:border-r">
                <label className="text-sm font-medium">Chọn ngày
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value || today)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ghi chú sắp tới</p>
                <div className="flex flex-col gap-1">
                  {upcoming.map((note) => (
                    <button
                      type="button"
                      key={note.id}
                      onClick={() => setSelectedDate(note.date)}
                      className={`rounded-lg px-2.5 py-2 text-left text-xs ${selectedDate === note.date ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      <span className="block font-semibold">{formatDate(note.date)}</span>
                      <span className="block truncate opacity-75">{note.content}</span>
                    </button>
                  ))}
                  {!isLoading && upcoming.length === 0 && <span className="text-xs text-muted-foreground">Chưa có ghi chú sắp tới.</span>}
                </div>
              </aside>
              <div className="flex min-h-[420px] min-w-0 flex-col gap-3 bg-muted/40 p-3 sm:p-6 md:min-h-0 md:overflow-y-auto">
                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm sm:p-8">
                <div>
                  <p className="text-sm font-semibold">{selectedDate === today ? 'Hôm nay' : formatDate(selectedDate)}</p>
                  <p className="text-xs text-muted-foreground">Nội dung có thể chỉnh sửa bất cứ lúc nào.</p>
                </div>
                <textarea
                  value={content}
                  onChange={(event) => setDrafts((current) => ({ ...current, [selectedDate]: event.target.value }))}
                  placeholder="Nhập công việc, lịch hẹn hoặc thông tin cần nhớ cho ngày này…"
                  className="min-h-64 flex-1 resize-none border-0 bg-transparent p-0 text-base leading-8 outline-none placeholder:text-muted-foreground/60"
                />
                {(saveMutation.isError || deleteMutation.isError) && <p className="text-sm text-red-600">Không thể cập nhật ghi chú.</p>}
                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => confirm('Xóa ghi chú ngày này?') && deleteMutation.mutate()}
                    disabled={!noteByDate.has(selectedDate) || deleteMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:invisible"
                  ><Trash2 size={15} /> Xóa</button>
                  <button
                    type="button"
                    onClick={() => saveMutation.mutate()}
                    disabled={!content.trim() || saveMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  ><Save size={15} /> {saveMutation.isPending ? 'Đang lưu…' : 'Lưu ghi chú'}</button>
                </div>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
