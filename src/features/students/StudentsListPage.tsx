'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Filter, ListChecks, Plus, Search, Star, X } from 'lucide-react';
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

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('student_list_page_size'));
      if ([30, 50, 100].includes(saved)) return saved;
    }
    return 30;
  });
  const [paginationMode, setPaginationMode] = useState<'pages' | 'infinite'>('pages');

  function handleSetPaginationMode(mode: 'pages' | 'infinite') {
    setPaginationMode(mode);
  }

  function handleSetPageSize(size: number) {
    setPageSize(size);
    setPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_list_page_size', String(size));
    }
  }

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

  const { data, isLoading: pagedIsLoading, isError: pagedIsError, isFetching: pagedIsFetching } = useQuery({
    queryKey: ['students', { ...filters, page, limit: pageSize }],
    queryFn: () => studentApi.list({ ...filters, page, limit: pageSize }),
    placeholderData: keepPreviousData,
    enabled: paginationMode === 'pages',
  });

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['students', 'infinite', { ...filters, limit: pageSize }],
    queryFn: ({ pageParam = 1 }) => studentApi.list({ ...filters, page: pageParam, limit: pageSize }),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.pages) return lastPage.meta.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: paginationMode === 'infinite',
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paginationMode !== 'infinite' || !infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        infiniteQuery.fetchNextPage();
      }
    }, { rootMargin: '300px' });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [paginationMode, infiniteQuery.hasNextPage, infiniteQuery.isFetchingNextPage, infiniteQuery.fetchNextPage]);

  const facets = paginationMode === 'infinite' ? infiniteQuery.data?.pages[0]?.meta.facets : data?.meta.facets;
  const pages = paginationMode === 'infinite' ? (infiniteQuery.data?.pages[0]?.meta.pages ?? 1) : (data?.meta.pages ?? 1);
  const totalCount = paginationMode === 'infinite' ? (infiniteQuery.data?.pages[0]?.meta.total ?? 0) : (data?.meta.total ?? 0);
  const isLoading = paginationMode === 'infinite' ? infiniteQuery.isLoading : pagedIsLoading;
  const isError = paginationMode === 'infinite' ? infiniteQuery.isError : pagedIsError;
  const isFetching = paginationMode === 'infinite' ? infiniteQuery.isFetching : pagedIsFetching;
  const visibleStudents = paginationMode === 'infinite' ? (infiniteQuery.data?.pages.flatMap((p) => p.data) ?? []) : (data?.data ?? []);

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
    return visibleStudents
      .map((student) => ({ student, days: daysUntil(student.studyAbroad?.visaExpiry) }))
      .filter((entry) => entry.days !== null && entry.days <= VISA_WARNING_DAYS)
      .sort((a, b) => (a.days as number) - (b.days as number));
  }, [visibleStudents]);

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

      {/* Quick Overview Stats Strip */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          type="button"
          onClick={() => clearFilters()}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-all',
            !hasFilter
              ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <span>Tất cả</span>
          <span className={cn('rounded-full px-1.5 py-0.2 text-[10px] font-bold', !hasFilter ? 'bg-white/20 text-white' : 'bg-muted text-foreground')}>
            {data?.meta.total ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPinnedOnly(!pinnedOnly)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-all',
            pinnedOnly
              ? 'border-amber-500 bg-amber-500 text-white shadow-2xs'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Star size={12} fill={pinnedOnly ? 'currentColor' : 'none'} />
          <span>Đã ghim</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedQuickFilter(selectedQuickFilter === 'due' ? 'all' : 'due')}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-all',
            selectedQuickFilter === 'due'
              ? 'border-red-500 bg-red-500 text-white shadow-2xs'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <span>Đến hạn</span>
          <span className={cn('rounded-full px-1.5 py-0.2 text-[10px] font-bold', selectedQuickFilter === 'due' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300')}>
            {dueCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedQuickFilter(selectedQuickFilter === 'todo' ? 'all' : 'todo')}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-all',
            selectedQuickFilter === 'todo'
              ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <span>Cần làm</span>
        </button>

        {visaAlerts.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedQuickFilter(selectedQuickFilter === 'visa' ? 'all' : 'visa')}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-all',
              selectedQuickFilter === 'visa'
                ? 'border-orange-500 bg-orange-500 text-white shadow-2xs'
                : 'border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
            )}
          >
            <AlertCircle size={12} />
            <span>Sắp hết visa</span>
            <span className={cn('rounded-full px-1.5 py-0.2 text-[10px] font-bold', selectedQuickFilter === 'visa' ? 'bg-white/20 text-white' : 'bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100')}>
              {visaAlerts.length}
            </span>
          </button>
        )}
      </div>

      {visaAlerts.length > 0 && (
        <details className="group mb-3 rounded-xl border border-orange-300 bg-orange-50/80 p-2.5 text-xs text-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
          <summary className="cursor-pointer font-medium flex items-center justify-between list-none">
            <span className="flex items-center gap-1.5 font-semibold">
              <AlertCircle size={15} className="text-orange-600 shrink-0" />
              {visaAlerts.length} học sinh sắp/đã hết hạn visa — cần gia hạn
            </span>
            <span className="text-[11px] text-orange-700 underline group-open:hidden">Xem danh sách</span>
            <span className="text-[11px] text-orange-700 underline hidden group-open:inline">Thu gọn</span>
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pl-5 list-disc border-t border-orange-200/60 pt-2 dark:border-orange-900/60">
            {visaAlerts.map(({ student, days }) => (
              <li key={student.id}>
                <button onClick={() => openStudent(student.id, 'profile')} className="font-semibold underline-offset-2 hover:underline">
                  {student.personal.fullName}
                </button>
                {' — '}
                {(days as number) < 0 ? `hết hạn ${Math.abs(days as number)} ngày trước` : `còn ${days} ngày`}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mb-4 rounded-xl border border-border bg-card p-3 shadow-2xs">
        {/* Mobile Filter Toggle & Sort Row */}
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors',
              showMobileFilters || hasFilter
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground'
            )}
          >
            <Filter size={14} />
            <span>Bộ lọc {hasFilter ? '(đang lọc)' : ''}</span>
            {showMobileFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <label className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as StudentSort)}
              className="h-9 rounded-lg border border-border bg-background py-1 pl-8 pr-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="priority">Ưu tiên xử lý</option>
              <option value="updated">Cập nhật gần nhất</option>
              <option value="name-asc">Tên A–Z</option>
              <option value="name-desc">Tên Z–A</option>
              <option value="visa">Visa hết hạn sớm</option>
            </select>
          </label>
        </div>

        {/* Filter Dropdowns */}
        <div className={cn(
          "flex-col gap-2 mt-2 pt-2 border-t border-border lg:mt-0 lg:pt-0 lg:border-t-0 lg:flex lg:flex-row lg:items-center",
          showMobileFilters ? "flex" : "hidden lg:flex"
        )}>
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

          <div className="hidden lg:flex items-center gap-2">
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

      {!isLoading && !isError && !hasFilter && visibleStudents.length === 0 && (
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

          {/* Mobile Compact Table (1 line per student ~36px) */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs md:hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2 pl-2 pr-1 w-7" aria-label="Ghim" />
                  <th className="py-2 px-2">Họ tên</th>
                  <th className="py-2 px-1 text-center w-14">Nước</th>
                  <th className="py-2 px-2 text-center w-28">Giai đoạn</th>
                  <th className="py-2 pr-2 pl-1 text-right w-9" aria-label="Mail" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visibleStudents.map((student) => {
                  const urgency = todoUrgency(student.todos ?? []);
                  const days = daysUntil(student.studyAbroad?.visaExpiry);
                  const isUrgentVisa = days !== null && days <= VISA_WARNING_DAYS;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => openStudent(student.id)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors h-9"
                    >
                      <td className="py-1 pl-2 pr-1 w-7" onClick={(e) => e.stopPropagation()}>
                        <PinButton studentId={student.id} pinned={student.pinned} />
                      </td>
                      <td className="py-1 px-2 font-medium text-card-foreground">
                        <div className="flex items-center gap-1 min-w-0 max-w-[130px] sm:max-w-none">
                          <span className="truncate">{student.personal.fullName}</span>
                          {urgency === 'due' && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" title="Đến hạn" />
                          )}
                          {urgency === 'tomorrow' && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Còn 1 ngày" />
                          )}
                          {isUrgentVisa && (
                            <span className="text-[10px] text-orange-600 font-bold shrink-0" title="Sắp hết hạn visa">!</span>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-1 text-center whitespace-nowrap text-muted-foreground text-[11px]">
                        {student.studyAbroad?.destinationCountry
                          ? COUNTRY_LABELS[student.studyAbroad.destinationCountry] ?? student.studyAbroad.destinationCountry
                          : '—'}
                      </td>
                      <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="max-w-[125px] mx-auto truncate">
                          <StageSelect
                            studentId={student.id}
                            stage={student.stage}
                            country={student.studyAbroad?.destinationCountry}
                            className="text-[10px] px-2 py-0.5"
                          />
                        </div>
                      </td>
                      <td className="py-1 pr-2 pl-1 text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                        <SendEmailButton
                          studentId={student.id}
                          stage={student.stage}
                          country={student.studyAbroad?.destinationCountry}
                          className="p-1"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Sentinel for infinite scroll */}
      {paginationMode === 'infinite' && (
        <div ref={sentinelRef} className="py-2 text-center text-xs text-muted-foreground">
          {infiniteQuery.isFetchingNextPage && (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Đang tải thêm học sinh…
            </span>
          )}
        </div>
      )}

      {/* Bottom pagination & infinite scroll controls */}
      {!isLoading && !isError && totalCount > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-medium text-foreground">
              {paginationMode === 'infinite' ? (
                <>Đã tải {visibleStudents.length} / {totalCount} học sinh</>
              ) : (
                <>{totalCount} học sinh · Trang {page}/{pages}</>
              )}
              {isFetching ? ' · đang tải…' : ''}
            </span>

            {/* Mode Switcher */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
              <button
                type="button"
                onClick={() => handleSetPaginationMode('pages')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  paginationMode === 'pages'
                    ? 'bg-card text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Số trang
              </button>
              <button
                type="button"
                onClick={() => handleSetPaginationMode('infinite')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  paginationMode === 'infinite'
                    ? 'bg-card text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Cuộn tải tiếp
              </button>
            </div>

            {/* Page Size options (pages mode) */}
            {paginationMode === 'pages' && (
              <div className="hidden sm:flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Xem:</span>
                {[30, 50, 100].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSetPageSize(sz)}
                    className={cn(
                      'rounded-md px-2 py-0.5 font-medium transition-colors',
                      pageSize === sz
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'border border-border hover:bg-muted text-foreground'
                    )}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Numbered Page Buttons */}
          {paginationMode === 'pages' && pages > 1 && (
            <div className="flex flex-wrap items-center gap-1 self-center sm:self-auto">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Trước</span>
              </button>

              {getPageNumbers(page, pages).map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn(
                      'min-w-8 h-8 px-2 text-xs font-semibold rounded-lg transition-colors',
                      page === p
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'border border-border text-foreground hover:bg-muted'
                    )}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="Trang sau"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Infinite mode controls */}
          {paginationMode === 'infinite' && (
            <div className="flex items-center gap-2 self-center sm:self-auto">
              {infiniteQuery.hasNextPage && (
                <button
                  type="button"
                  onClick={() => infiniteQuery.fetchNextPage()}
                  disabled={infiniteQuery.isFetchingNextPage}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                >
                  {infiniteQuery.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm học sinh'}
                </button>
              )}
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Lên đầu trang"
              >
                ↑ Lên đầu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
