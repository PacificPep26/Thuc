'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Trash2 } from 'lucide-react';
import { salaryApi } from './salary.api';
import { SalarySettingsPanel } from './SalarySettingsPanel';
import type { BonusItem } from './salary.types';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + ' đ';
}

export function SalaryCalculator() {
  const queryClient = useQueryClient();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [showSettings, setShowSettings] = useState(false);
  const [personName, setPersonName] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [deductionLabel, setDeductionLabel] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');

  const configQuery = useQuery({ queryKey: ['salary', 'config'], queryFn: salaryApi.getConfig });
  const entriesQuery = useQuery({
    queryKey: ['salary', 'entries', monthKey],
    queryFn: () => salaryApi.listEntries(monthKey),
  });

  const saveConfigMutation = useMutation({
    mutationFn: ({ baseSalary, bonusItems }: { baseSalary: number; bonusItems: BonusItem[] }) =>
      salaryApi.updateConfig(baseSalary, bonusItems),
    onSuccess: (config) => {
      queryClient.setQueryData(['salary', 'config'], config);
      setShowSettings(false);
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: ({ label, amount, personName }: { label: string; amount: number; personName?: string }) =>
      salaryApi.addEntry(monthKey, label, amount, personName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'entries', monthKey] });
      setPersonName('');
    },
  });

  const removeEntryMutation = useMutation({
    mutationFn: (id: string) => salaryApi.removeEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salary', 'entries', monthKey] }),
  });

  const config = configQuery.data;
  const entries = entriesQuery.data ?? [];
  const bonusTotal = useMemo(() => entries.reduce((sum, e) => sum + e.amount, 0), [entries]);
  const total = (config?.baseSalary ?? 0) + bonusTotal;

  function addCustomEntry() {
    if (!customLabel.trim() || !customAmount) return;
    addEntryMutation.mutate({ label: customLabel.trim(), amount: Number(customAmount) || 0, personName });
    setCustomLabel('');
    setCustomAmount('');
  }

  function addDeduction() {
    if (!deductionLabel.trim() || !deductionAmount) return;
    addEntryMutation.mutate({ label: deductionLabel.trim(), amount: -(Number(deductionAmount) || 0), personName });
    setDeductionLabel('');
    setDeductionAmount('');
  }

  if (configQuery.isLoading || !config) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tính lương tháng</h1>
          <p className="text-sm text-muted-foreground">Lương cơ bản + các khoản cộng thưởng bạn ghi nhận</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Settings size={16} />
            Cài đặt
          </button>
        </div>
      </div>

      {showSettings && (
        <SalarySettingsPanel
          config={config}
          isSaving={saveConfigMutation.isPending}
          onSave={(baseSalary, bonusItems) => saveConfigMutation.mutate({ baseSalary, bonusItems })}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Summary Card first for instant overview */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng lương tháng {monthKey}</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary mt-0.5">{formatVnd(total)}</div>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <div>Cơ bản: <span className="font-semibold text-foreground">{formatVnd(config.baseSalary)}</span></div>
            <div>Thưởng/Trừ: <span className={`font-semibold ${bonusTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {bonusTotal >= 0 ? `+${formatVnd(bonusTotal)}` : `-${formatVnd(Math.abs(bonusTotal))}`}
            </span></div>
          </div>
        </div>

        <details className="group mt-3" open={entries.length > 0 && entries.length <= 5}>
          <summary className="cursor-pointer font-medium text-xs text-muted-foreground hover:text-foreground flex items-center justify-between list-none py-1">
            <span>Chi tiết các khoản ghi nhận ({entries.length})</span>
            <span className="text-[11px] text-primary group-open:hidden">Xem danh sách ▼</span>
            <span className="text-[11px] text-primary hidden group-open:inline">Thu gọn ▲</span>
          </summary>
          <div className="mt-2 flex flex-col divide-y divide-border border-t border-border/60">
            {entries.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between py-2 text-xs sm:text-sm">
                <span className="text-muted-foreground">
                  {entry.label}
                  {entry.personName && <span className="font-medium text-foreground"> — {entry.personName}</span>}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className={`font-semibold ${entry.amount >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                    {entry.amount >= 0 ? '+ ' : '− '}{formatVnd(Math.abs(entry.amount))}
                  </span>
                  <button
                    onClick={() => removeEntryMutation.mutate(entry._id)}
                    className="rounded p-1 text-muted-foreground hover:text-red-500"
                    title="Xóa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {entries.length === 0 && (
              <p className="py-2 text-xs text-muted-foreground">Chưa có khoản cộng thưởng nào trong tháng này.</p>
            )}
          </div>
        </details>
      </div>

      {/* Bonus addition card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-card-foreground">Bấm để cộng thưởng</h2>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Tên học sinh / khách hàng (tùy chọn)</label>
          <input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="VD: Nguyễn Văn A"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:max-w-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {config.bonusItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addEntryMutation.mutate({ label: item.label, amount: item.amount, personName })}
              className="rounded-lg bg-primary/10 px-3 py-2 text-xs sm:text-sm font-semibold text-primary transition-all hover:bg-primary/20 active:scale-95"
            >
              + {item.label} ({formatVnd(item.amount)})
            </button>
          ))}
          {config.bonusItems.length === 0 && (
            <p className="text-xs text-muted-foreground">Chưa có mục thưởng. Vào Cài đặt để thêm.</p>
          )}
        </div>

        {/* Custom bonus & deductions collapsible */}
        <details className="group mt-4 border-t border-border pt-3">
          <summary className="cursor-pointer font-medium text-xs text-muted-foreground hover:text-foreground flex items-center justify-between list-none">
            <span>Thêm khoản cộng khác hoặc khoản trừ ▼</span>
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <span className="text-xs font-semibold text-card-foreground">Khoản cộng khác</span>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Khoản cộng khác (VD: Thưởng nóng)"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Số tiền"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-ring sm:w-36"
                />
                <button
                  onClick={addCustomEntry}
                  className="rounded-md border border-border px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cộng
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-red-600">Khoản trừ (Phạt, tạm ứng...)</span>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={deductionLabel}
                  onChange={(e) => setDeductionLabel(e.target.value)}
                  placeholder="Khoản trừ (VD: Phạt trễ, Tạm ứng)"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="Số tiền"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-ring sm:w-36"
                />
                <button
                  onClick={addDeduction}
                  className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-100"
                >
                  Trừ
                </button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
