'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserRound } from 'lucide-react';
import { travelerApi } from '@/features/travelers/traveler.api';
import { TravelerDetailModal } from '@/features/travelers/detail/TravelerDetailModal';
import { stageApi } from '@/features/stages/stage.api';
import type { Student } from '../student.types';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'mb-0.5 block text-xs font-medium text-muted-foreground';
const RELATIONS = ['Cha', 'Mẹ', 'Anh/chị/em', 'Người giám hộ', 'Khác'];

type Draft = { relation: string; fullName: string; phone: string; email: string };

// Relatives (usually parents) travelling or applying for their own visa, linked to this student.
// Adding one pre-fills the contact details already kept in the student's family block.
export function RelativesTab({ student }: { student: Student }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openTravelerId, setOpenTravelerId] = useState<string | null>(null);

  const { data: relatives, isLoading } = useQuery({
    queryKey: ['travelers', { studentId: student.id }],
    queryFn: () => travelerApi.list({ studentId: student.id, limit: 50 }),
  });
  const { data: stages } = useQuery({ queryKey: ['stages', 'travel'], queryFn: () => stageApi.list('travel') });

  const family = student.family ?? {};
  const prefill = (relation: 'Cha' | 'Mẹ' | 'Khác'): Draft =>
    relation === 'Cha'
      ? { relation, fullName: family.fatherName ?? '', phone: family.fatherPhone ?? '', email: family.fatherEmail ?? '' }
      : relation === 'Mẹ'
        ? { relation, fullName: family.motherName ?? '', phone: family.motherPhone ?? '', email: family.motherEmail ?? '' }
        : { relation, fullName: '', phone: '', email: '' };

  const createMutation = useMutation({
    mutationFn: (d: Draft) =>
      travelerApi.create({
        studentId: student.id,
        personal: {
          fullName: d.fullName.trim(),
          relationToStudent: d.relation,
          phone: d.phone.trim() || undefined,
          email: d.email.trim() || undefined,
        },
        travel: { destinationCountry: student.studyAbroad?.destinationCountry },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelers'] });
      setDraft(null);
    },
  });

  const list = relatives?.data ?? [];
  const stageTitle = (key: string) => stages?.find((s) => s.key === key)?.title ?? key;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-card-foreground">Người thân của {student.personal.fullName}</h3>
        <p className="text-xs text-muted-foreground">
          Phụ huynh hoặc người thân đi du lịch/xin visa riêng. Hồ sơ nằm ở mục Du lịch và được liên kết với học sinh này.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {!isLoading && list.length === 0 && !draft && (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Chưa có người thân nào được liên kết.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {list.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setOpenTravelerId(t.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-left hover:bg-muted/50"
            >
              <UserRound size={18} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t.personal.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t.personal.relationToStudent ?? 'Người thân'}
                  {t.travel?.destinationCountry ? ` · ${t.travel.destinationCountry}` : ''}
                  {t.personal.phone ? ` · ${t.personal.phone}` : ''}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs">{stageTitle(t.stage)}</span>
            </button>
          </li>
        ))}
      </ul>

      {draft ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.fullName.trim().length >= 2) createMutation.mutate(draft);
          }}
          className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-2"
        >
          <div>
            <label className={labelClass}>Quan hệ</label>
            <select value={draft.relation} onChange={(e) => setDraft({ ...draft, relation: e.target.value })} className={inputClass}>
              {RELATIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Họ tên</label>
            <input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} className={inputClass} autoFocus />
          </div>
          <div>
            <label className={labelClass}>Số điện thoại</label>
            <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} type="email" className={inputClass} />
          </div>
          {createMutation.isError && <p className="text-sm text-red-500 sm:col-span-2">Không thể thêm. Kiểm tra họ tên và email.</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setDraft(null)} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              Hủy
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || draft.fullName.trim().length < 2}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createMutation.isPending ? 'Đang thêm…' : 'Thêm người thân'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(['Cha', 'Mẹ', 'Khác'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDraft(prefill(r))}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              <Plus size={14} /> {r === 'Khác' ? 'Người thân khác' : `Thêm ${r.toLowerCase()}`}
            </button>
          ))}
        </div>
      )}

      <TravelerDetailModal travelerId={openTravelerId} onOpenChange={(open) => !open && setOpenTravelerId(null)} />
    </div>
  );
}
