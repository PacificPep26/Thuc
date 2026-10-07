'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Plus, Search } from 'lucide-react';
import { travelerApi } from './traveler.api';
import { CreateTravelerModal } from './CreateTravelerModal';
import { TravelerDetailModal, type TravelerDetailTabKey } from './detail/TravelerDetailModal';
import { StudentDetailModal } from '@/features/students/detail/StudentDetailModal';
import { StageSelect } from './StageSelect';
import { stageApi } from '@/features/stages/stage.api';
import { cn } from '@/lib/utils';

const countryLabels: Record<string, string> = { USA: 'Mỹ', Canada: 'Canada', 'New Zealand': 'New Zealand', Germany: 'Đức', France: 'Pháp' };

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

export function TravelersListPage() {
  const [search, setSearch] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<'all' | 'visa'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = useState<string | null>(null);
  const [linkedStudentId, setLinkedStudentId] = useState<string | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<TravelerDetailTabKey | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['travelers', { search, destinationCountry }],
    queryFn: () =>
      travelerApi.list({
        search: search || undefined,
        destinationCountry: destinationCountry || undefined,
        page: 1,
        limit: 20,
      }),
  });

  const { data: stagesData } = useQuery({
    queryKey: ['stages', 'traveler'],
    queryFn: () => stageApi.list('travel'),
  });

  function openTraveler(travelerId: string, tab?: TravelerDetailTabKey) {
    setDetailInitialTab(tab);
    setSelectedTravelerId(travelerId);
  }

  const visaAlerts = useMemo(() => {
    return (data?.data ?? [])
      .map((traveler) => ({ traveler, days: daysUntil(traveler.travel?.visaExpiry) }))
      .filter((entry) => entry.days !== null && entry.days <= VISA_WARNING_DAYS)
      .sort((a, b) => (a.days as number) - (b.days as number));
  }, [data]);

  const sortedTravelers = useMemo(() => {
    const stageOrder = new Map((stagesData ?? []).map((stage, index) => [stage.key, index]));

    return [...(data?.data ?? [])].sort((a, b) => {
      const aOrder = stageOrder.get(a.stage ?? '') ?? Number.MAX_SAFE_INTEGER;
      const bOrder = stageOrder.get(b.stage ?? '') ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.personal.fullName.localeCompare(b.personal.fullName, 'vi');
    });
  }, [data, stagesData]);

  const stageTitleMap = useMemo(() => {
    return new Map((stagesData ?? []).map((stage) => [stage.key, stage.title]));
  }, [stagesData]);

  const visibleTravelers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortedTravelers.filter((traveler) => {
      const matchesStage = !selectedStage || traveler.stage === selectedStage;
      const matchesQuickFilter =
        selectedQuickFilter === 'all' ||
        (selectedQuickFilter === 'visa' && daysUntil(traveler.travel?.visaExpiry) !== null && daysUntil(traveler.travel?.visaExpiry)! <= VISA_WARNING_DAYS);

      const matchesSearch =
        !normalizedSearch ||
        traveler.personal.fullName.toLowerCase().includes(normalizedSearch) ||
        (traveler.stage && (traveler.stage.toLowerCase().includes(normalizedSearch) || stageTitleMap.get(traveler.stage)?.toLowerCase().includes(normalizedSearch)));

      return matchesStage && matchesQuickFilter && matchesSearch;
    });
  }, [search, selectedQuickFilter, selectedStage, sortedTravelers, stageTitleMap]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Du lịch / Visa phụ huynh</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên / giai đoạn…"
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={destinationCountry}
            onChange={(e) => setDestinationCountry(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Tất cả điểm đến</option>
            <option value="USA">Mỹ</option>
            <option value="Canada">Canada</option>
            <option value="New Zealand">New Zealand</option>
            <option value="Germany">Đức</option>
            <option value="France">Pháp</option>
          </select>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-90 hover:shadow-md active:brightness-75 sm:w-auto"
          >
            <Plus size={16} />
            Thêm hồ sơ
          </button>
        </div>
      </div>

      <CreateTravelerModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <StudentDetailModal studentId={linkedStudentId} onOpenChange={(open) => !open && setLinkedStudentId(null)} />
      <TravelerDetailModal
        travelerId={selectedTravelerId}
        initialTab={detailInitialTab}
        onOpenChange={(open) => !open && setSelectedTravelerId(null)}
      />

      {visaAlerts.length > 0 && (
        <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <AlertCircle size={16} className="shrink-0" />
            {visaAlerts.length} hồ sơ sắp/đã hết hạn visa — cần theo dõi:
          </div>
          <ul className="flex flex-col gap-0.5 pl-6">
            {visaAlerts.map(({ traveler, days }) => (
              <li key={traveler.id}>
                <button onClick={() => openTraveler(traveler.id, 'profile')} className="underline-offset-2 hover:underline">
                  {traveler.personal.fullName}
                </button>
                {' — '}
                {(days as number) < 0 ? `hết hạn ${Math.abs(days as number)} ngày trước` : `còn ${days} ngày`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setSelectedStage(null);
            setSelectedQuickFilter('all');
          }}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            !selectedStage && selectedQuickFilter === 'all'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          )}
        >
          Tất cả
        </button>

        <button
          onClick={() => {
            setSelectedStage(null);
            setSelectedQuickFilter('visa');
          }}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            selectedQuickFilter === 'visa' && !selectedStage
              ? 'border-amber-500 bg-amber-500 text-white'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          )}
        >
          Visa gần hết hạn
        </button>

        {(stagesData ?? []).map((stage) => (
          <button
            key={stage.id}
            onClick={() => {
              setSelectedStage(stage.key);
              setSelectedQuickFilter('all');
            }}
            style={selectedStage === stage.key ? { backgroundColor: stage.color ?? '#d4d4d8' } : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              selectedStage === stage.key
                ? 'border-transparent text-[#2c1810]'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color ?? '#d4d4d8' }} />
            {stage.title}
            <span className="text-xs opacity-70">{sortedTravelers.filter((x) => x.stage === stage.key).length}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Đang tải danh sách…
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-red-500">
          Không thể tải danh sách.
        </div>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Chưa có hồ sơ nào.
        </div>
      )}

      {!isLoading && !isError && visibleTravelers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-205 text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Họ tên</th>
              <th className="px-4 py-3 font-medium">Quan hệ</th>
              <th className="px-4 py-3 font-medium">Điểm đến</th>
              <th className="px-4 py-3 font-medium">Thời hạn visa</th>
              <th className="px-4 py-3 font-medium">Giai đoạn</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Đang tải danh sách…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                  Không thể tải danh sách.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Chưa có hồ sơ nào.
                </td>
              </tr>
            )}
            {visibleTravelers.map((traveler) => (
              <tr
                key={traveler.id}
                onClick={() => openTraveler(traveler.id)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
              >
                <td className="px-4 py-3 font-medium text-card-foreground">{traveler.personal.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {traveler.studentId && traveler.studentName ? (
                    <span>
                      {traveler.personal.relationToStudent ? `${traveler.personal.relationToStudent} của ` : 'Người thân của '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLinkedStudentId(traveler.studentId!);
                        }}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {traveler.studentName}
                      </button>
                    </span>
                  ) : (
                    traveler.personal.relationToStudent ?? '—'
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {traveler.travel?.destinationCountry
                    ? countryLabels[traveler.travel.destinationCountry] ?? traveler.travel.destinationCountry
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <VisaCountdown visaExpiry={traveler.travel?.visaExpiry} />
                </td>
                <td className="px-4 py-3">
                  <StageSelect travelerId={traveler.id} stage={traveler.stage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
