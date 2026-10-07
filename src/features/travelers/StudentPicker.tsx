'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, X } from 'lucide-react';
import { studentApi } from '@/features/students/student.api';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

// Picks the student a traveler (usually a parent) belongs to. Shows the current link and lets staff change or clear it.
export function StudentPicker({
  studentId,
  studentName,
  onChange,
}: {
  studentId?: string | null;
  studentName?: string;
  onChange: (student: { id: string; name: string } | null) => void;
}) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  const { data } = useQuery({
    queryKey: ['student-picker', debounced],
    queryFn: () => studentApi.list({ search: debounced, limit: 8 }),
    enabled: debounced.length >= 2,
  });

  if (studentId) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <Link2 size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{studentName ?? 'Học sinh đã liên kết'}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-muted-foreground hover:text-red-500" aria-label="Bỏ liên kết">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Gõ tên học sinh để liên kết…" className={inputClass} />
      {debounced.length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {(data?.data ?? []).length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy học sinh</li>}
          {(data?.data ?? []).map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ id: s.id, name: s.personal.fullName });
                  setTerm('');
                }}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{s.personal.fullName}</span>
                <span className="text-xs text-muted-foreground">{s.personal.personalEmail ?? s.personal.email ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
