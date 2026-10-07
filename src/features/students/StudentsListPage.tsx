'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowUpDown, ListChecks, Plus, Search, Star, X } from 'lucide-react';
import { studentApi } from './student.api';
import { SERVICE_LABELS, type ServiceType } from './student.types';
import { CreateStudentModal } from './CreateStudentModal';
import { StudentDetailModal, type StudentDetailTabKey } from './detail/StudentDetailModal';
import { StageSelect } from './StageSelect';
import { PinButton } from './PinButton';
import { SendEmailButton } from '@/features/notifications/SendEmailButton';
import { stageApi } from '@/features/stages/stage.api';
import { cn } from '@/lib/utils';
import { COUNTRY_LABELS } from '@/lib/countries';
import { DailyNotesHeader } from '@/features/daily-notes/DailyNotesHeader';


const VISA_WARNING_DAYS = 30;

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

function VisaCountdown({ visaExpiry }: { visaExpiry?: string }) {
  const days = daysUntil(visaExpiry);
  if (days === null) return <span className="text-muted-foreground">—</span>;

  const isExpired = days < 0;
  const isUrgent = days <= VISA_WARNING_DAYS;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        isExpired ? 'text-red-600' : isUrgent ? 'text-orange-500' : 'text-muted-foreground'
      )}
    >
      {isUrgent && <AlertCircle size={14} className="shrink-0" />}
      {isExpired ? `Hết hạn ${Math.abs(days)} ngày trước` : `Còn ${days} ngày`}
    </span>
  );
}

type TodoUrgency = 'due' | 'tomorrow' | 'open' | 'none';

function todoUrgency(todos: Array<{ done: boolean; dueDate?: string }>): TodoUrgency {
  const open = todos.filter((todo) => !todo.done);
  if (!open.length) return 'none';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrow = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  if (open.some((todo) => todo.dueDate && todo.dueDate <= today)) return 'due';
  if (open.some((todo) => todo.dueDate === tomorrow)) return 'tomorrow';
  return 'open';
}

// Country chips in this order; values match student.studyAbroad.destinationCountry.
const COUNTRY_ORDER = ['USA', 'Canada', 'New Zealand', 'Germany', 'France'];

const PAGE_SIZE = 30;
type QuickFilter = 'all' | 'visa' | 'todo' | 'due';
type StudentSort = 'priority' | 'updated' | 'name-asc' | 'name-desc' | 'visa';

interface StoredFilters {
  search: string;
  selectedStage: string | null;
  selectedCountry: string | null;
  selectedService?: ServiceType | null;
  selectedQuickFilter: QuickFilter;
  pinnedOnly: boolean;
  sort: StudentSort;
}

const FILTER_STORAGE_KEY = 'thucsys:student-filters';
const FILTER_EVENT = 'thucsys-student-filters-change';
const DEFAULT_FILTERS: StoredFilters = {
  search: '', selectedStage: null, selectedCountry: null, selectedQuickFilter: 'all', pinnedOnly: false, sort: 'priority',
};
const DEFAULT_FILTERS_JSON = JSON.stringify(DEFAULT_FILTERS);

function filterSnapshot() {
  return typeof window === 'undefined' ? DEFAULT_FILTERS_JSON : localStorage.getItem(FILTER_STORAGE_KEY) ?? DEFAULT_FILTERS_JSON;
}

function subscribeToFilters(callback: () => void) {
  const onStorage = (event: StorageEvent) => event.key === FILTER_STORAGE_KEY && callback();
  window.addEventListener('storage', onStorage);
  window.addEventListener(FILTER_EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(FILTER_EVENT, callback);
  };
}

function parseFilters(snapshot: string): StoredFilters {
  try {
    return { ...DEFAULT_FILTERS, ...JSON.parse(snapshot) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function useStoredFilters() {
  const snapshot = useSyncExternalStore(subscribeToFilters, filterSnapshot, () => DEFAULT_FILTERS_JSON);
  const filters = useMemo(() => parseFilters(snapshot), [snapshot]);
  function update(patch: Partial<StoredFilters>) {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ ...filters, ...patch }));
    window.dispatchEvent(new Event(FILTER_EVENT));
  }
  return { filters, update };
}

function FilterChip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ lọc ${label}`}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X size={12} />
      </button>
    </span>
  );
}

export function StudentsListPage() {
  const { filters: storedFilters, update: updateFilters } = useStoredFilters();
  const { search, selectedStage, selectedCountry, selectedQuickFilter, pinnedOnly, sort } = storedFilters;
  const selectedService = storedFilters.selectedService ?? null;
  const setSelectedService = (value: ServiceType | null) => updateFilters({ selectedService: value });
  const setSearch = (value: string) => updateFilters({ search: value });
  const setSelectedStage = (value: string | null) => updateFilters({ selectedStage: value });
  const setSelectedCountry = (value: string | null) => updateFilters({ selectedCountry: value });
  const setSelectedQuickFilter = (value: QuickFilter) => updateFilters({ selectedQuickFilter: value });
  const setPinnedOnly = (value: boolean) => updateFilters({ pinnedOnly: value });
  const setSort = (value: StudentSort) => updateFilters({ sort: value });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<StudentDetailTabKey | undefined>(undefined);

  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filtering, paging and chip counts happen on the server (see /api/students).
  const filters = {
    search: debouncedSearch || undefined,
    destinationCountry: selectedCountry ?? undefined,
    stage: selectedStage ?? undefined,
    serviceType: selectedService ?? undefined,
    quick: selectedQuickFilter === 'all' ? undefined : selectedQuickFilter,
    pinned: pinnedOnly || undefined,
    sort,
  };
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['students', { ...filters, page }],
    queryFn: () => studentApi.list({ ...filters, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const facets = data?.meta.facets;
  const pages = data?.meta.pages ?? 1;

  // Any filter change goes back to page 1.
  const [filterKey, setFilterKey] = useState('');
  const currentKey = JSON.stringify(filters);
  if (currentKey !== filterKey) {
    setFilterKey(currentKey);
    if (page !== 1) setPage(1);
  }

  const { data: stagesData } = useQuery({
    queryKey: ['stages', 'student'],
    queryFn: () => stageApi.list('student'),
  });

  function openStudent(studentId: string, tab?: StudentDetailTabKey) {
    setDetailInitialTab(tab);
    setSelectedStudentId(studentId);
  }

  const visaAlerts = useMemo(() => {
    return (data?.data ?? [])
      .map((student) => ({ student, days: daysUntil(student.studyAbroad?.visaExpiry) }))
      .filter((entry) => entry.days !== null && entry.days <= VISA_WARNING_DAYS)
      .sort((a, b) => (a.days as number) - (b.days as number));
  }, [data]);

  const visibleStudents = data?.data ?? [];
  const dueCount = facets?.due ?? 0;
  const countryCounts = new Map(Object.entries(facets?.countries ?? {}));
  const stageCounts = new Map(Object.entries(facets?.stages ?? {}));

  const hasFilter = Boolean(selectedCountry || selectedStage || selectedService || selectedQuickFilter !== 'all' || pinnedOnly);

  const selectedStageData = (stagesData ?? []).find((stage) => stage.key === selectedStage);
  const quickFilterLabels: Record<Exclude<QuickFilter, 'all'>, string> = {
    visa: 'Visa gần hết hạn',
    todo: 'Cần làm',
    due: 'Đến hạn cập nhật',
  };

  function clearFilters() {
    setSelectedCountry(null);
    setSelectedStage(null);
    setSelectedQuickFilter('all');
    setPinnedOnly(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold text-foreground">Học sinh</h1>
        <DailyNotesHeader />
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên / email…"
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-90 hover:shadow-md active:brightness-75 sm:w-auto"
          >
            <Plus size={16} />
            Thêm học sinh
          </button>
        </div>
      </div>

      <CreateStudentModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <StudentDetailModal
        studentId={selectedStudentId}
        initialTab={detailInitialTab}
        onOpenChange={(open) => !open && setSelectedStudentId(null)}
      />

      {visaAlerts.length > 0 && (
        <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <AlertCircle size={16} className="shrink-0" />
            {visaAlerts.length} học sinh sắp/đã hết hạn visa — cần gia hạn:
          </div>
          <ul className="flex flex-col gap-0.5 pl-6">
            {visaAlerts.map(({ student, days }) => (
              <li key={student.id}>
                <button onClick={() => openStudent(student.id, 'profile')} className="underline-offset-2 hover:underline">
                  {student.personal.fullName}
                </button>
                {' — '}
                {(days as number) < 0 ? `hết hạn ${Math.abs(days as number)} ngày trước` : `còn ${days} ngày`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              aria-label="Lọc theo quốc gia"
              value={selectedCountry ?? ''}
              onChange={(event) => setSelectedCountry(event.target.value || null)}
              className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Quốc gia · Tất cả ({facets?.all ?? 0})</option>
              {COUNTRY_ORDER.map((country) => (
                <option key={country} value={country} disabled={!countryCounts.get(country)}>
                  {COUNTRY_LABELS[country] ?? country} ({countryCounts.get(country) ?? 0})
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo giai đoạn"
              value={selectedStage ?? ''}
              onChange={(event) => setSelectedStage(event.target.value || null)}
              className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Giai đoạn · Tất cả</option>
              {(stagesData ?? []).map((stage) => (
                <option key={stage.id} value={stage.key} disabled={!stageCounts.get(stage.key) && selectedStage !== stage.key}>
                  {stage.title} ({stageCounts.get(stage.key) ?? 0})
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo loại dịch vụ"
              value={selectedService ?? ''}
              onChange={(event) => setSelectedService((event.target.value || null) as ServiceType | null)}
              className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Dịch vụ · Tất cả</option>
              {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              aria-label="Lọc theo trạng thái"
              value={selectedQuickFilter}
              onChange={(event) => setSelectedQuickFilter(event.target.value as QuickFilter)}
              className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Trạng thái · Tất cả</option>
              <option value="visa">Visa gần hết hạn</option>
              <option value="todo">Cần làm</option>
              <option value="due">Đến hạn cập nhật ({dueCount})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={pinnedOnly}
              onClick={() => setPinnedOnly(!pinnedOnly)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
                pinnedOnly ? 'bg-amber-500 text-white' : 'bg-background text-muted-foreground hover:text-foreground'
              )}
            >
              <Star size={15} fill={pinnedOnly ? 'currentColor' : 'none'} />
              Đã ghim
            </button>

            <label className="relative ml-auto lg:ml-0">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <span className="sr-only">Sắp xếp</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as StudentSort)}
                className="h-9 rounded-md border border-border bg-background py-1.5 pl-9 pr-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="priority">Ưu tiên xử lý</option>
                <option value="updated">Cập nhật gần nhất</option>
                <option value="name-asc">Tên A–Z</option>
                <option value="name-desc">Tên Z–A</option>
                <option value="visa">Visa hết hạn sớm</option>
              </select>
            </label>
          </div>
        </div>

        {hasFilter && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-xs font-medium text-muted-foreground">Đang lọc:</span>
            {selectedCountry && <FilterChip label={COUNTRY_LABELS[selectedCountry] ?? selectedCountry} onRemove={() => setSelectedCountry(null)} />}
            {selectedService && <FilterChip label={SERVICE_LABELS[selectedService]} onRemove={() => setSelectedService(null)} />}
            {selectedStage && <FilterChip label={selectedStageData?.title ?? selectedStage} color={selectedStageData?.color} onRemove={() => setSelectedStage(null)} />}
            {selectedQuickFilter !== 'all' && <FilterChip label={quickFilterLabels[selectedQuickFilter]} onRemove={() => setSelectedQuickFilter('all')} />}
            {pinnedOnly && <FilterChip label="Đã ghim" onRemove={() => setPinnedOnly(false)} />}
            <button type="button" onClick={clearFilters} className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">
              Xoá tất cả
            </button>
          </div>
        )}
      </div>

      {!isLoading && !isError && hasFilter && visibleStudents.length === 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Không có học sinh nào khớp bộ lọc.
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Đang tải danh sách học sinh…
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-red-500">
          Không thể tải danh sách học sinh.
        </div>
      )}

      {!isLoading && !isError && !hasFilter && data?.data.length === 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Chưa có học sinh nào.
        </div>
      )}

      {!isLoading && !isError && visibleStudents.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="w-10 py-3 pl-3 pr-0 font-medium" aria-label="Ghim" />
                  <th className="px-4 py-3 font-medium">Họ tên</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Điểm đến</th>
                  <th className="px-4 py-3 font-medium">Thời hạn visa</th>
                  <th className="px-4 py-3 font-medium">Giai đoạn</th>
                  <th className="px-4 py-3 font-medium">Việc cần làm</th>
                  <th className="px-4 py-3 font-medium">Mail</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => {
                  const urgency = todoUrgency(student.todos ?? []);

                  return (
                    <tr
                      key={student.id}
                      onClick={() => openStudent(student.id)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="py-3 pl-3 pr-0">
                        <PinButton studentId={student.id} pinned={student.pinned} />
                      </td>
                      <td className="px-4 py-3 font-medium text-card-foreground">
                        {student.personal.fullName}
                        {student.service?.serviceType && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                            {SERVICE_LABELS[student.service.serviceType as ServiceType]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{student.personal.personalEmail ?? student.personal.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.studyAbroad?.destinationCountry
                          ? COUNTRY_LABELS[student.studyAbroad.destinationCountry] ?? student.studyAbroad.destinationCountry
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <VisaCountdown visaExpiry={student.studyAbroad?.visaExpiry} />
                      </td>
                      <td className="px-4 py-3">
                        <StageSelect
                          studentId={student.id}
                          stage={student.stage}
                          country={student.studyAbroad?.destinationCountry} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudent(student.id, 'notes');
                          }}
                          title="Xem việc cần làm"
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 hover:bg-muted',
                            urgency === 'due'
                              ? 'bg-red-50 text-red-600 hover:text-red-700'
                              : urgency === 'tomorrow'
                                ? 'bg-amber-50 text-amber-600 hover:text-amber-700'
                                : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <ListChecks size={16} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <SendEmailButton studentId={student.id} stage={student.stage} country={student.studyAbroad?.destinationCountry} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {visibleStudents.map((student) => {
              const urgency = todoUrgency(student.todos ?? []);

              return (
                <div
                  key={student.id}
                  onClick={() => openStudent(student.id)}
                  className="cursor-pointer rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1 font-semibold text-card-foreground">
                        <PinButton studentId={student.id} pinned={student.pinned} />
                        {student.personal.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">{student.personal.personalEmail ?? student.personal.email}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openStudent(student.id, 'notes');
                      }}
                      className={cn(
                        'rounded-md border px-2 py-1 text-xs',
                        urgency === 'due'
                          ? 'border-red-300 bg-red-50 text-red-600'
                          : urgency === 'tomorrow'
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-border bg-background text-muted-foreground'
                      )}
                    >
                      {urgency === 'due' ? 'Đến hạn' : urgency === 'tomorrow' ? 'Còn 1 ngày' : urgency === 'open' ? 'Cần làm' : 'Ổn'}
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Điểm đến</span>
                      <span>{student.studyAbroad?.destinationCountry ? COUNTRY_LABELS[student.studyAbroad.destinationCountry] ?? student.studyAbroad.destinationCountry : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Visa</span>
                      <VisaCountdown visaExpiry={student.studyAbroad?.visaExpiry} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-muted-foreground">Giai đoạn</span>
                      <div className="flex items-center gap-2">
                        <StageSelect
                          studentId={student.id}
                          stage={student.stage}
                          country={student.studyAbroad?.destinationCountry} className="flex-1" />
                        <SendEmailButton studentId={student.id} stage={student.stage} country={student.studyAbroad?.destinationCountry} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data?.meta.total ?? 0} học sinh · trang {page}/{pages}
            {isFetching ? ' · đang tải…' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1.5 font-medium hover:text-foreground disabled:opacity-40"
            >
              Trang trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="rounded-md border border-border px-3 py-1.5 font-medium hover:text-foreground disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
