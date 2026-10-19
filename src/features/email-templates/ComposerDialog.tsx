'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Download, Plus, X } from 'lucide-react';
import type { EmailTemplate } from './email-template.types';
import { copyEmailHtml, copyText } from '@/features/notifications/copyEmail';
import {
  autoRange,
  buildPracticeHtml,
  currentRange,
  defaultPracticeForm,
  isoDay,
  longDate,
  practiceChecks,
  practiceSubject,
  sortedSessions,
  timeLabel,
  weekdayOf,
  type PracticeForm,
} from '@/lib/email-templates/composers';

// Navy + orange palette of the Catholic MTA letterhead, kept local to this dialog so the composer
// looks like the email it produces regardless of the dashboard theme.
const inputClass =
  'w-full rounded-lg border border-[#B9C8DA] bg-white px-3 py-2.5 text-sm text-[#0A1F4E] outline-none hover:border-[#56678A] focus:ring-2 focus:ring-[#F28C00]';
const labelClass = 'block text-[13px] font-semibold text-[#0A1F4E]';
const sectionClass = 'space-y-3 border-b border-[#D6E0EC] py-5 first:pt-0 last:border-b-0';
const headingClass = 'text-[15px] font-bold text-[#002B66]';
const hintClass = 'text-xs font-normal text-[#56678A]';
const linkClass = 'font-semibold text-[#E07F00] underline underline-offset-2';
const ghostBtn = 'rounded-lg border border-[#B9C8DA] bg-white px-3 py-2 text-sm font-semibold text-[#0A1F4E] hover:border-[#56678A]';

const draftKey = (seedKey?: string) => `email-composer:${seedKey ?? 'practice'}`;

function loadDraft(seedKey?: string): PracticeForm {
  const base = defaultPracticeForm();
  try {
    const raw = localStorage.getItem(draftKey(seedKey));
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<PracticeForm>;
    const merged = { ...base };
    for (const k of Object.keys(base) as (keyof PracticeForm)[]) {
      if (k in saved && typeof saved[k] === typeof base[k]) (merged as Record<string, unknown>)[k] = saved[k];
    }
    if (Array.isArray(saved.sessions)) {
      merged.sessions = saved.sessions
        .filter((s) => s && typeof s === 'object')
        .map((s) => ({ date: String(s.date ?? ''), time: String(s.time ?? '') }));
    }
    return merged;
  } catch {
    return base;
  }
}

// Images in the template are site-relative; code/file output must carry absolute URLs to work elsewhere.
function absoluteImages(html: string) {
  return html.replace(/src="(\/email\/[\w-]+\.png)"/g, (_m, p: string) => `src="${window.location.origin}${p}"`);
}

export function ComposerDialog({
  template,
  onClose,
  onNotice,
}: {
  template: EmailTemplate | null;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  return (
    <Dialog.Root open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        {template && <ComposerBody key={template.id} template={template} onNotice={onNotice} />}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ComposerBody({ template, onNotice }: { template: EmailTemplate; onNotice: (m: string) => void }) {
  const [form, setForm] = useState<PracticeForm>(() => loadDraft(template.seedKey));
  const [view, setView] = useState<'desk' | 'mobile'>('desk');
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [frameH, setFrameH] = useState(900);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const patch = (p: Partial<PracticeForm>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(template.seedKey), JSON.stringify(form));
    } catch {
      // draft is a convenience only
    }
  }, [form, template.seedKey]);

  const today = isoDay(new Date());
  const range = currentRange(form);
  const subject = practiceSubject(form);
  const checks = useMemo(() => practiceChecks(form, today), [form, today]);
  const previewHtml = useMemo(() => buildPracticeHtml(template.html, form, { preheader: true }), [template.html, form]);
  const outOfOrder = useMemo(() => {
    const dated = form.sessions.filter((s) => s.date);
    const sorted = sortedSessions(form.sessions);
    return dated.length !== sorted.length || dated.some((s, i) => s !== sorted[i]);
  }, [form.sessions]);

  function updateSession(i: number, p: Partial<{ date: string; time: string }>) {
    patch({ sessions: form.sessions.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  }

  function addSession() {
    const last = sortedSessions(form.sessions).at(-1);
    let next = new Date();
    next.setDate(next.getDate() + 1);
    if (last) {
      const [y, m, d] = last.date.split('-').map(Number);
      next = new Date(y, m - 1, d + 1);
      if (next.getDay() === 0) next.setDate(next.getDate() + 1); // skip Sunday
    }
    patch({ sessions: [...form.sessions, { date: isoDay(next), time: last?.time || '09:00' }] });
  }

  function sortSessions() {
    const rest = form.sessions.filter((s) => !s.date);
    patch({ sessions: [...sortedSessions(form.sessions), ...rest] });
  }

  function measure() {
    const h = frameRef.current?.contentDocument?.documentElement.scrollHeight;
    if (h && h > 100) setFrameH(h);
  }

  async function run(action: () => Promise<void>, ok: string) {
    try {
      await action();
      onNotice(ok);
    } catch (e) {
      onNotice(e instanceof Error ? e.message : 'Trình duyệt không cho phép sao chép.');
    }
  }

  const copyEmail = () =>
    run(
      () => copyEmailHtml(buildPracticeHtml(template.html, form, { preheader: false })),
      'Đã sao chép email. Mở Gmail, bấm Soạn thư rồi dán (Ctrl+V) vào phần nội dung.'
    );
  const copyCode = () =>
    run(() => copyText(absoluteImages(buildPracticeHtml(template.html, form, { preheader: true }))), 'Đã sao chép mã HTML đầy đủ.');
  const copySubject = () => run(() => copyText(subject), 'Đã sao chép tiêu đề email.');

  function download() {
    const html = absoluteImages(buildPracticeHtml(template.html, form, { preheader: true }));
    const slug =
      form.name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'hoc-vien';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `email-lich-phong-van-${slug}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    onNotice(`Đã tải file ${a.download}.`);
  }

  const frameWidth = view === 'desk' ? 700 : 390;

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[94vh] w-[96vw] max-w-7xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#D6E0EC] bg-white text-[#0A1F4E] shadow-xl">
      <div className="flex items-center gap-3.5 border-b border-[#D6E0EC] px-4 py-3 sm:px-6 sm:py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/email/emblem.png" alt="Catholic MTA" className="h-10 w-auto rounded-lg border border-[#D6E0EC] bg-white p-1" />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="text-base sm:text-lg font-bold leading-tight text-[#002B66]">{template.name}</Dialog.Title>
          <Dialog.Description className="truncate text-xs sm:text-[13px] text-[#56678A]">Điền thông tin, kiểm tra bản xem trước rồi sao chép vào Gmail.</Dialog.Description>
        </div>
        <Dialog.Close aria-label="Đóng" className="rounded-lg p-1.5 text-[#56678A] hover:bg-[#EBF1F8]"><X size={19} /></Dialog.Close>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex border-b border-[#D6E0EC] bg-[#F2F5F9] p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
            mobileTab === 'form' ? 'bg-white text-[#002B66] shadow-xs' : 'text-[#56678A]'
          }`}
        >
          1. Điền thông tin form
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
            mobileTab === 'preview' ? 'bg-white text-[#002B66] shadow-xs' : 'text-[#56678A]'
          }`}
        >
          2. Xem trước thư
        </button>
      </div>

      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[400px_1fr] lg:overflow-hidden">
        <div className={`border-b border-[#D6E0EC] px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto lg:border-b-0 lg:border-r ${mobileTab !== 'form' ? 'hidden lg:block' : ''}`}>
          <section className={sectionClass}>
            <h3 className={headingClass}>Học viên</h3>
            <label className={labelClass}>Tên học viên
              <input className={`${inputClass} mt-1`} value={form.name} placeholder="Ví dụ: Mai Hương Giang" onChange={(e) => patch({ name: e.target.value })} />
            </label>
          </section>

          <section className={sectionClass}>
            <h3 className={headingClass}>Lịch luyện tập</h3>
            <div className="space-y-2">
              {form.sessions.map((s, i) => (
                <div key={i} className="space-y-2 rounded-[10px] border border-[#D6E0EC] bg-[#EBF1F8] p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#FEEECB] px-2.5 py-1 text-[13px] font-bold text-[#0A1F4E]">Buổi {i + 1}</span>
                    <span className={`min-w-0 flex-1 truncate text-[13px] ${s.date ? 'font-medium' : 'text-[#56678A]'}`}>
                      {s.date ? `${weekdayOf(s.date)}, ${longDate(s.date)}${s.time ? ` · ${timeLabel(s.time)}` : ''}` : 'Chọn ngày cho buổi này'}
                    </span>
                    <button
                      type="button"
                      aria-label={`Xóa buổi ${i + 1}`}
                      onClick={() => patch({ sessions: form.sessions.filter((_, k) => k !== i) })}
                      className="rounded-lg p-1.5 text-[#56678A] hover:bg-white"
                    ><X size={15} /></button>
                  </div>
                  <div className="grid grid-cols-[1.25fr_1fr] gap-2">
                    <input type="date" className={inputClass} aria-label={`Ngày buổi ${i + 1}`} value={s.date} onChange={(e) => updateSession(i, { date: e.target.value })} />
                    <input type="time" step={300} className={inputClass} aria-label={`Giờ buổi ${i + 1}`} value={s.time} onChange={(e) => updateSession(i, { time: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addSession} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#B9C8DA] py-2 text-sm font-semibold text-[#002B66] hover:bg-[#EBF1F8]">
              <Plus size={15} /> Thêm buổi
            </button>
            {outOfOrder && (
              <p className={hintClass}>
                Thư sẽ xếp các buổi theo thứ tự ngày.{' '}
                <button type="button" onClick={sortSessions} className={linkClass}>Sắp xếp lại danh sách</button>
              </p>
            )}

            <div className="pt-1">
              <span className={labelClass}>Khoảng ngày ghi trong thư</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input type="date" className={inputClass} aria-label="Từ ngày" value={range.from} onChange={(e) => patch({ from: e.target.value, to: range.to, rangeManual: true })} />
                <input type="date" className={inputClass} aria-label="Đến ngày" value={range.to} onChange={(e) => patch({ to: e.target.value, from: range.from, rangeManual: true })} />
              </div>
              <p className={`${hintClass} mt-1`}>
                {form.rangeManual ? (
                  <>Bạn đã tự chọn. <button type="button" className={linkClass} onClick={() => patch({ rangeManual: false })}>Tính lại theo lịch</button></>
                ) : autoRange(form.sessions) ? (
                  'Tự tính theo lịch (thứ Hai đến thứ Bảy của tuần có buổi học).'
                ) : (
                  'Sẽ tự tính khi có ngày buổi học.'
                )}
              </p>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className={headingClass}>Chi tiết buổi học</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>Hình thức
                <input className={`${inputClass} mt-1`} value={form.format} onChange={(e) => patch({ format: e.target.value })} />
              </label>
              <label className={labelClass}>Mentor
                <input className={`${inputClass} mt-1`} value={form.mentor} placeholder="Trần Ngọc Duyên" onChange={(e) => patch({ mentor: e.target.value })} />
              </label>
            </div>
            <label className={labelClass}>Link phòng học (không bắt buộc)
              <input type="url" inputMode="url" className={`${inputClass} mt-1`} value={form.meet} placeholder="https://meet.google.com/..." onChange={(e) => patch({ meet: e.target.value })} />
              <span className={`${hintClass} mt-1 block`}>Có link thì email hiện thêm nút để học viên bấm vào phòng.</span>
            </label>
            <label className={labelClass}>Nội dung
              <textarea rows={3} className={`${inputClass} mt-1 resize-y`} value={form.content} onChange={(e) => patch({ content: e.target.value })} />
            </label>
          </section>

          <section className={sectionClass}>
            <h3 className={headingClass}>Gửi email</h3>
            <label className={labelClass}>Tiêu đề email
              <input className={`${inputClass} mt-1`} value={subject} onChange={(e) => patch({ subject: e.target.value, subjectManual: true })} />
              <span className={`${hintClass} mt-1 block`}>
                {form.subjectManual ? (
                  <>Đang dùng tiêu đề bạn tự sửa. <button type="button" className={linkClass} onClick={() => patch({ subjectManual: false })}>Tạo lại tự động</button></>
                ) : 'Tự tạo theo tên và ngày, có thể sửa.'}
              </span>
            </label>
          </section>
        </div>

        <div className={`min-w-0 bg-[#F2F5F9] px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto ${mobileTab !== 'preview' ? 'hidden lg:block' : ''}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className={headingClass}>Bản xem trước</h3>
            <div className="inline-flex overflow-hidden rounded-lg border border-[#B9C8DA] bg-white text-[13px] font-semibold" role="group" aria-label="Kích thước xem trước">
              {([['desk', 'Máy tính'], ['mobile', 'Điện thoại']] as const).map(([key, label]) => (
                <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}
                  className={`px-3.5 py-1.5 ${view === key ? 'bg-[#002B66] text-white' : 'text-[#56678A]'}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="mx-auto overflow-x-auto" style={{ maxWidth: frameWidth }}>
            <iframe
              ref={frameRef}
              title="Xem trước email"
              sandbox="allow-same-origin allow-popups"
              srcDoc={previewHtml}
              onLoad={measure}
              className="block rounded-xl border border-[#D6E0EC] bg-[#F1F4F8] shadow-sm"
              style={{ width: frameWidth, height: frameH }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-[#D6E0EC] bg-white px-4 py-3 sm:px-6 sm:py-3.5">
        {checks.length > 0 ? (
          <div className="max-h-24 overflow-y-auto rounded-lg bg-[#FFF4E2] px-3 py-2 text-xs text-[#8A4B00]">
            <strong>Cần kiểm tra trước khi gửi</strong>
            <ul className="mt-1 list-disc pl-4">{checks.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        ) : (
          <p className="text-xs text-[#1D6E47]">Thông tin đã đầy đủ.</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1 truncate text-xs sm:text-sm"><span className="text-[#56678A]">Tiêu đề: </span>{subject}</div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={copySubject} className={ghostBtn}>Copy tiêu đề</button>
            <button type="button" onClick={copyCode} className={`${ghostBtn} hidden sm:inline-flex`}>Sao chép mã HTML</button>
            <button type="button" onClick={download} className={`${ghostBtn} hidden sm:inline-flex items-center gap-1.5`}><Download size={14} /> Tải .html</button>
            <button type="button" onClick={copyEmail} className="flex items-center gap-2 rounded-lg bg-[#002B66] px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#0B3E86]">
              <Copy size={15} /> Sao chép email
            </button>
          </div>
        </div>
      </div>
    </Dialog.Content>
  );
}
