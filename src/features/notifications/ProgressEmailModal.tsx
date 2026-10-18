'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DestinationCountry } from '@/features/students/student.types';
import { AlertTriangle, Check, ChevronDown, Copy, FileText, LayoutTemplate, RotateCcw, Save, Search, Send, X } from 'lucide-react';
import { studentApi } from '@/features/students/student.api';
import { stageApi } from '@/features/stages/stage.api';
import { emailTemplateApi } from '@/features/email-templates/email-template.api';
import type { EmailTemplate } from '@/features/email-templates/email-template.types';
import {
  LIBRARY_FIELD_SOURCE,
  STAGE_LIBRARY_KEY,
  fillLibraryText,
  libraryValues,
  missingLibraryValues,
} from '@/lib/email-templates/stage-library';
import { notificationApi } from './notification.api';
import { useQueueEmail } from './SendQueue';
import { copyEmailHtml, copyText } from './copyEmail';
import { COUNTRY_LABELS, countryLabel } from '@/lib/countries';
import {
  NOTIFY_FIELDS,
  STAFF_FIELD_KEYS,
  countryKey,
  resolveTemplate,
} from '@/lib/notifications/templates';
import {
  buildInfoRows,
  eyebrowFor,
  letterLabels,
  buildProgressSteps,
  headingFromStageTitle,
  fillPlaceholders,
  findMissingVars,
  renderEmailHtml,
  toDateInputValue,
} from '@/lib/notifications/render';
import { cn } from '@/lib/utils';

const STAFF_STORAGE_KEY = 'progress-email-staff';
const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

function loadStaff(): Record<string, string> {
  try {
    const stored = JSON.parse(localStorage.getItem(STAFF_STORAGE_KEY) ?? '{}') as Record<string, string>;
    return Object.fromEntries(Object.entries(stored).filter(([key]) => (STAFF_FIELD_KEYS as string[]).includes(key)));
  } catch {
    return {};
  }
}

function saveStaff(info: Record<string, string>) {
  try {
    const staff = Object.fromEntries(STAFF_FIELD_KEYS.map((k) => [k, info[k] ?? '']));
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staff));
  } catch {
    // storage unavailable
  }
}

const AUTO_VARS = new Set(['maHoSo', 'tenHocSinh', 'tenGoi', 'tenHocSinhHoa', 'ngayGui']);

const MISSING_LABELS: Record<string, string> = {
  quocGia: 'Quốc gia du học',
  truong: 'Trường (hồ sơ)',
  tenTruong: 'Trường (hồ sơ)',
};

const PLACEHOLDER_LABELS: Record<string, string> = {
  tenHocSinh: 'Tên học sinh',
  tenPhuHuynh: 'Tên phụ huynh',
  maHoSo: 'Mã hồ sơ',
  tenTruong: 'Tên trường',
  truong: 'Tên trường',
  quocGia: 'Quốc gia',
  ngayTiepNhan: 'Ngày tiếp nhận / ký HĐ',
  ngayKyHopDong: 'Ngày ký hợp đồng',
  ngayNopHoSo: 'Ngày nộp hồ sơ',
  ngayCapThu: 'Ngày cấp thư mời / I-20',
  ngayCapI20: 'Ngày cấp I-20',
  ngayCapThuMoi: 'Ngày cấp thư mời (LOA/Offer)',
  ngayCapNhatTiepTheo: 'Ngày cập nhật tiếp theo',
  hanNopGiayTo: 'Hạn nộp giấy tờ',
  ngayPhongVan: 'Ngày phỏng vấn',
  gioPhongVan: 'Giờ phỏng vấn',
  lichPhongVan: 'Lịch phỏng vấn',
  diaDiemPhongVan: 'Địa điểm phỏng vấn',
  lichLuyenPhongVan: 'Lịch luyện phỏng vấn',
  diaDiemLuyenPhongVan: 'Địa điểm luyện phỏng vấn',
  tuNgay: 'Thực hành từ ngày',
  denNgay: 'Thực hành đến ngày',
  ngayBuoi1: 'Ngày buổi 1',
  thuBuoi1: 'Thứ buổi 1',
  gioBuoi1: 'Giờ buổi 1',
  ngayBuoi2: 'Ngày buổi 2',
  thuBuoi2: 'Thứ buổi 2',
  gioBuoi2: 'Giờ buổi 2',
  ngayBuoi3: 'Ngày buổi 3',
  thuBuoi3: 'Thứ buổi 3',
  gioBuoi3: 'Giờ buổi 3',
  hinhThuc: 'Hình thức',
  mentor: 'Mentor',
  noiDungLuyenTap: 'Nội dung luyện tập',
  noiDungBoSung1: 'Nội dung bổ sung 1',
  noiDungBoSung2: 'Nội dung bổ sung 2',
  noiDungBoSung3: 'Nội dung bổ sung 3',
};

const COUNTRY_OPTIONS: Array<{ value: DestinationCountry; label: string }> = [
  { value: 'USA', label: COUNTRY_LABELS.USA },
  { value: 'Canada', label: COUNTRY_LABELS.Canada },
  { value: 'New Zealand', label: COUNTRY_LABELS['New Zealand'] },
  { value: 'Germany', label: COUNTRY_LABELS.Germany },
  { value: 'France', label: COUNTRY_LABELS.France },
];

const STAGE_EVENT_DATE: Record<string, string> = {
  gd1_hop_dong: 'ngayKyHopDong',
  gd2_nop_ho_so: 'ngayNopHoSo',
  gd3_i20_visa: 'ngayCapI20',
};

interface ProgressEmailModalProps {
  studentId: string | null;
  stageKey: string | null;
  onClose: () => void;
}

// Visual HTML Editor in an iframe with designMode
function VisualEmailEditor({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);

  function setup() {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    doc.designMode = 'on';
    doc.addEventListener('input', () => onChange(`<!DOCTYPE html>\n${doc.documentElement.outerHTML}`));
  }

  function format(command: 'bold' | 'italic' | 'underline') {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    frame.current?.contentWindow?.focus();
    doc.execCommand(command);
    onChange(`<!DOCTYPE html>\n${doc.documentElement.outerHTML}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-2 min-h-0">
      <div className="flex items-center gap-1.5 border-b border-border/70 pb-2">
        {([['bold', 'B', 'font-bold'], ['italic', 'I', 'italic'], ['underline', 'U', 'underline']] as const).map(
          ([cmd, label, cls]) => (
            <button
              key={cmd}
              type="button"
              onClick={() => format(cmd)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors',
                cls,
              )}
            >
              {label}
            </button>
          ),
        )}
        <span className="text-xs text-muted-foreground ml-2">Bấm thẳng vào nội dung thư bên dưới để gõ sửa</span>
      </div>
      <iframe
        ref={frame}
        title="Sửa nội dung mail"
        srcDoc={initialHtml}
        onLoad={setup}
        className="flex-1 min-h-[500px] w-full rounded-xl border border-border bg-white"
      />
    </div>
  );
}

interface TemplateOption {
  key: string;
  name: string;
  subject?: string;
  isLibrary: boolean;
  isDefault?: boolean;
}

function TemplateSearchSelect({
  options,
  selectedKey,
  onSelect,
}: {
  options: TemplateOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.key === selectedKey);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.subject && o.subject.toLowerCase().includes(q)),
    );
  }, [options, query]);

  const libraryFiltered = filtered.filter((o) => o.isLibrary);
  const stageFiltered = filtered.filter((o) => !o.isLibrary);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery('');
        }}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-medium shadow-2xs transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
          isOpen && 'border-primary ring-2 ring-primary/20',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileText size={15} className="shrink-0 text-primary" />
          <span className="truncate text-foreground font-semibold">
            {selectedOption?.name ?? '— Chọn mẫu thư —'}
          </span>
          {selectedOption?.isDefault && (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
              Gợi ý
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 flex max-h-[360px] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          {/* Sticky Search Box */}
          <div className="border-b border-border p-2 bg-muted/40">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false);
                  if (e.key === 'Enter' && filtered.length > 0) {
                    onSelect(filtered[0].key);
                    setIsOpen(false);
                  }
                }}
                placeholder="Tìm tên mẫu thư hoặc tiêu đề..."
                className="w-full rounded-lg border border-border bg-background pl-8 pr-7 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* List of items */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-2 text-xs">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground">Không tìm thấy mẫu phù hợp với &quot;{query}&quot;</p>
            ) : (
              <>
                {libraryFiltered.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Mẫu thư viện (/email-templates)
                    </div>
                    <div className="space-y-0.5">
                      {libraryFiltered.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            onSelect(opt.key);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                            opt.key === selectedKey
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-muted text-card-foreground',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{opt.name}</span>
                              {opt.isDefault && (
                                <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                                  Gợi ý
                                </span>
                              )}
                            </div>
                            {opt.subject && (
                              <p className="truncate text-[10px] text-muted-foreground mt-0.5">{opt.subject}</p>
                            )}
                          </div>
                          {opt.key === selectedKey && <Check size={14} className="shrink-0 text-primary mt-0.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {stageFiltered.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-border/50 pt-1.5 mt-1">
                      Mẫu tiến độ hệ thống
                    </div>
                    <div className="space-y-0.5">
                      {stageFiltered.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            onSelect(opt.key);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                            opt.key === selectedKey
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-muted text-card-foreground',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="truncate font-medium">{opt.name}</span>
                            {opt.subject && (
                              <p className="truncate text-[10px] text-muted-foreground mt-0.5">{opt.subject}</p>
                            )}
                          </div>
                          {opt.key === selectedKey && <Check size={14} className="shrink-0 text-primary mt-0.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProgressEmailModal({ studentId, stageKey, onClose }: ProgressEmailModalProps) {
  const open = Boolean(studentId && stageKey);

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentApi.getById(studentId as string),
    enabled: open,
  });
  const { data: stages } = useQuery({ queryKey: ['stages', 'student'], queryFn: () => stageApi.list('student') });
  const { data: history } = useQuery({
    queryKey: ['notifications', studentId],
    queryFn: () => notificationApi.list(studentId as string),
    enabled: open,
  });

  const { data: library } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplateApi.list(),
    enabled: open,
  });

  const stage = stages?.find((s) => s.key === stageKey);
  const template = stage?.emailTemplate;

  // Selected template state: 'lib:<id>' for library templates, or 'stage' for standard stage letter
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');

  const [to, setTo] = useState('');
  const [bccCompany, setBccCompany] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [caseCode, setCaseCode] = useState('');
  const [info, setInfo] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [libSubjectEdit, setLibSubjectEdit] = useState<string | null>(null);
  const [libHtmlEdit, setLibHtmlEdit] = useState<string | null>(null);
  const [editorSeed, setEditorSeed] = useState('');
  const initializedFor = useRef<string | null>(null);

  // Initialize data and default template selection
  useEffect(() => {
    if (!open || !student || !template) return;
    const marker = `${student.id}:${stageKey}`;
    if (initializedFor.current === marker) return;
    initializedFor.current = marker;

    const next = new Date();
    next.setDate(next.getDate() + (template.nextUpdateDays ?? 7));
    const staff = loadStaff();
    setTo(student.personal.personalEmail ?? '');

    const text = resolveTemplate(template.presetKey, student.studyAbroad.destinationCountry, template);
    setSubject(text.subject);
    setBody(text.body);
    setCaseCode(student.caseCode ?? '');

    const today = toDateInputValue(new Date());
    const isUs = (countryKey(student.studyAbroad.destinationCountry) ?? 'USA') === 'USA';
    const eventDate =
      template.presetKey === 'gd3_i20_visa' && !isUs ? 'ngayCapThuMoi' : STAGE_EVENT_DATE[template.presetKey ?? ''];

    setInfo({
      ...(eventDate ? { [eventDate]: today } : {}),
      ...Object.fromEntries(Object.entries(staff).filter(([, v]) => v)),
      ...student.notifyInfo,
      ngayCapNhatTiepTheo: toDateInputValue(next),
    });

    setEditing(false);
    setLibSubjectEdit(null);
    setLibHtmlEdit(null);

    // Pick default template for stage
    const defaultLibKey = STAGE_LIBRARY_KEY[template.presetKey ?? ''];
    if (defaultLibKey && library) {
      const match = library.find((t) => t.seedKey === defaultLibKey);
      setSelectedTemplateKey(match ? `lib:${match.id}` : 'stage');
    } else {
      setSelectedTemplateKey('stage');
    }
  }, [open, student, template, stageKey, library]);

  // If library loads after initial effect, set default if not chosen
  useEffect(() => {
    if (!open || !template || !library?.length) return;
    if (!selectedTemplateKey) {
      const defaultLibKey = STAGE_LIBRARY_KEY[template.presetKey ?? ''];
      const match = defaultLibKey ? library.find((t) => t.seedKey === defaultLibKey) : undefined;
      setSelectedTemplateKey(match ? `lib:${match.id}` : 'stage');
    }
  }, [open, template, library, selectedTemplateKey]);

  useEffect(() => {
    if (!open) {
      initializedFor.current = null;
      setSelectedTemplateKey('');
    }
  }, [open]);

  // Current active template
  const currentLibraryTemplate: EmailTemplate | undefined = useMemo(() => {
    if (!selectedTemplateKey.startsWith('lib:')) return undefined;
    const id = selectedTemplateKey.replace('lib:', '');
    return library?.find((t) => t.id === id);
  }, [selectedTemplateKey, library]);

  const isLibrary = Boolean(currentLibraryTemplate);

  function handleSelectTemplate(key: string) {
    setSelectedTemplateKey(key);
    setEditing(false);
    setLibSubjectEdit(null);
    setLibHtmlEdit(null);
  }

  const defaultLibraryKey = STAGE_LIBRARY_KEY[template?.presetKey ?? ''];

  const templateOptions = useMemo<TemplateOption[]>(() => {
    const list: TemplateOption[] = [];
    (library ?? []).forEach((t) => {
      list.push({
        key: `lib:${t.id}`,
        name: t.name,
        subject: t.subject,
        isLibrary: true,
        isDefault: t.seedKey === defaultLibraryKey,
      });
    });
    if (stage?.emailTemplate) {
      list.push({
        key: 'stage',
        name: `Thư cập nhật tiến độ (${stage.title})`,
        subject: stage.emailTemplate.subject,
        isLibrary: false,
        isDefault: !defaultLibraryKey,
      });
    }
    return list;
  }, [library, stage, defaultLibraryKey]);

  const isUs = (countryKey(student?.studyAbroad.destinationCountry) ?? 'USA') === 'USA';

  const vars = useMemo(() => {
    const country = student?.studyAbroad.destinationCountry;
    return {
      ...info,
      quocGia: countryLabel(country),
      truong: student?.studyAbroad.preferredUniversities?.[0] ?? '',
      tenTruong: student?.studyAbroad.preferredUniversities?.[0] ?? '',
      maHoSo: caseCode,
      tenHocSinh: student?.personal.fullName ?? '',
      tenHocSinhHoa: (student?.personal.fullName ?? '').toLocaleUpperCase('vi-VN'),
      ngayGui: toDateInputValue(new Date()),
      tenGoi: student?.personal.fullName.trim().split(/\s+/).pop() ?? '',
    };
  }, [info, student, caseCode]);

  const libValues = useMemo(() => libraryValues(vars), [vars]);
  const libSubject = libSubjectEdit ?? currentLibraryTemplate?.subject ?? '';
  const libHtml = libHtmlEdit ?? currentLibraryTemplate?.html ?? '';
  const libTexts = useMemo(
    () => (currentLibraryTemplate ? [libSubject, libHtml] : []),
    [currentLibraryTemplate, libSubject, libHtml],
  );

  // Determine dynamic fields required by current template
  const dynamicFields: Array<{ key: string; label: string; type: string; placeholder?: string }> = useMemo(() => {
    if (isLibrary) {
      const placeholders = new Set<string>();
      for (const t of libTexts) {
        for (const [, key] of t.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
          placeholders.add(key);
        }
      }
      // Strip auto vars & profile vars handled separately
      AUTO_VARS.forEach((k) => placeholders.delete(k));
      placeholders.delete('quocGia');
      placeholders.delete('truong');
      placeholders.delete('tenTruong');

      // Map placeholders to canonical info fields
      const fieldList: Array<{ key: string; label: string; type: string; placeholder?: string }> = [];
      const addedKeys = new Set<string>();

      for (const p of placeholders) {
        let fieldKey = p;
        let label = PLACEHOLDER_LABELS[p] ?? p;
        let type = 'text';

        if (p === 'tenPhuHuynh') {
          fieldKey = 'tenPhuHuynh';
          type = 'text';
          label = 'Tên phụ huynh';
        } else if (p === 'ngayTiepNhan' || p === 'ngayKyHopDong') {
          fieldKey = 'ngayKyHopDong';
          type = 'date';
          label = 'Ngày ký hợp đồng / tiếp nhận';
        } else if (p === 'ngayCapThu' || p === 'ngayCapI20' || p === 'ngayCapThuMoi') {
          fieldKey = isUs ? 'ngayCapI20' : 'ngayCapThuMoi';
          type = 'date';
          label = isUs ? 'Ngày cấp I-20' : 'Ngày cấp thư mời (LOA/Offer)';
        } else if (p === 'ngayPhongVan' || p === 'gioPhongVan' || p === 'lichPhongVan') {
          fieldKey = 'lichPhongVan';
          type = 'datetime-local';
          label = 'Lịch phỏng vấn';
        } else if (p === 'ngayNopHoSo') {
          fieldKey = 'ngayNopHoSo';
          type = 'date';
          label = 'Ngày nộp hồ sơ';
        } else if (p === 'ngayCapNhatTiepTheo') {
          fieldKey = 'ngayCapNhatTiepTheo';
          type = 'date';
          label = 'Ngày cập nhật tiếp theo';
        } else {
          const notifyMatch = NOTIFY_FIELDS.find((f) => f.key === p);
          if (notifyMatch) {
            fieldKey = notifyMatch.key;
            type = notifyMatch.type;
            label = notifyMatch.label;
          }
        }

        if (!addedKeys.has(fieldKey)) {
          addedKeys.add(fieldKey);
          fieldList.push({ key: fieldKey, label, type });
        }
      }
      return fieldList;
    }

    // Built-in stage letter fields
    const used = new Set(findMissingVars([subject, body], {}));
    if ([subject, body].some((t) => /\{\{\s*tenPhuHuynh\s*\}\}/.test(t))) used.add('tenPhuHuynh');
    return NOTIFY_FIELDS.filter((f) => used.has(f.key)).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
    }));
  }, [isLibrary, libTexts, isUs, subject, body]);

  const usesSchool = isLibrary
    ? (libSubject + libHtml).includes('{{tenTruong}}') || (libSubject + libHtml).includes('{{truong}}')
    : /\{\{\s*truong\s*\}\}/.test(subject + body);

  const missing = useMemo(() => {
    if (isLibrary) {
      return missingLibraryValues(libTexts, libValues)
        .filter((k) => !AUTO_VARS.has(k))
        .map((k) => (k === 'tenTruong' ? 'truong' : (LIBRARY_FIELD_SOURCE[k] ?? k)));
    }
    return findMissingVars([subject, body], vars).filter((k) => !AUTO_VARS.has(k));
  }, [isLibrary, libTexts, libValues, subject, body, vars]);

  const shownSubject = isLibrary ? fillLibraryText(libSubject, libValues) : fillPlaceholders(subject, vars);

  const previewHtml = useMemo(() => {
    if (isLibrary && currentLibraryTemplate) {
      return fillLibraryText(libHtml, { ...libValues, maHoSo: libValues.maHoSo || 'Chưa cấp' }, true);
    }
    return renderEmailHtml({
      subject: fillPlaceholders(subject, vars),
      body: fillPlaceholders(body, vars),
      ...buildProgressSteps(stages ?? [], stageKey ?? '', student?.studyAbroad.destinationCountry),
      eyebrow: eyebrowFor(student?.studyAbroad.destinationCountry),
      ...letterLabels(template?.presetKey),
      heading:
        letterLabels(template?.presetKey).heading ??
        headingFromStageTitle(stage?.title, student?.studyAbroad.destinationCountry),
      caseCode: caseCode || 'Chưa cấp',
      info: buildInfoRows(vars, student?.studyAbroad.destinationCountry),
    });
  }, [
    isLibrary,
    currentLibraryTemplate,
    libHtml,
    libValues,
    subject,
    body,
    vars,
    stages,
    stageKey,
    student,
    template,
    stage,
    caseCode,
  ]);

  const queryClient = useQueryClient();
  const queueEmail = useQueueEmail();

  const countryMutation = useMutation({
    mutationFn: (country: DestinationCountry) =>
      studentApi.update(studentId as string, { studyAbroad: { destinationCountry: country } }),
    onSuccess: (_s, country) => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      if (template) {
        const text = resolveTemplate(template.presetKey, country, template);
        setSubject(text.subject);
        setBody(text.body);
      }
    },
  });

  const schools = student?.studyAbroad.preferredUniversities ?? [];

  const schoolMutation = useMutation({
    mutationFn: (school: string) =>
      studentApi.update(studentId as string, {
        studyAbroad: { preferredUniversities: [school, ...schools.filter((u) => u !== school)] },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  function changeSchool(school: string) {
    if (school && school !== schools[0]) schoolMutation.mutate(school);
  }

  function changeCountry(country: DestinationCountry) {
    if (country) countryMutation.mutate(country);
  }

  const caseCodeMutation = useMutation({
    mutationFn: (value: string) => studentApi.update(studentId as string, { caseCode: value }),
    onSuccess: (updated) => {
      setCaseCode(updated.caseCode ?? '');
      queryClient.setQueryData(['student', studentId], updated);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const infoMutation = useMutation({
    mutationFn: (values: Record<string, string>) => studentApi.update(studentId as string, { notifyInfo: values }),
    onSuccess: (updated) => queryClient.setQueryData(['student', studentId], updated),
  });

  function saveField(key: string) {
    const value = (info[key] ?? '').trim();
    if (value && value !== (student?.notifyInfo?.[key] ?? '')) infoMutation.mutate({ [key]: value });
  }

  const [syncSuccess, setSyncSuccess] = useState(false);

  const saveToLibraryMutation = useMutation({
    mutationFn: async () => {
      if (!currentLibraryTemplate) return;
      return await emailTemplateApi.update(currentLibraryTemplate.id, {
        name: currentLibraryTemplate.name,
        subject: libSubject.trim(),
        html: libHtmlEdit ?? currentLibraryTemplate.html,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    },
  });

  const saveToStageMutation = useMutation({
    mutationFn: async () => {
      if (!stage || !template) return;
      return await stageApi.update(stage.id, {
        emailTemplate: {
          ...template,
          subject: subject.trim(),
          body: body.trim(),
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stages'] });
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    },
  });

  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function handleCopy(kind: 'subject' | 'body') {
    setCopyError(null);
    try {
      let code = caseCode.trim();
      if (isLibrary && !code && libTexts.some((t) => t.includes('{{maHoSo}}'))) {
        code = await notificationApi.ensureCaseCode(studentId as string);
        setCaseCode(code);
        queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      }
      const values = { ...libValues, maHoSo: code || libValues.maHoSo };
      const subjectText = isLibrary ? fillLibraryText(libSubject, values) : shownSubject;
      const html = isLibrary ? fillLibraryText(libHtml, values, true) : previewHtml;
      if (kind === 'subject') await copyText(subjectText);
      else await copyEmailHtml(html);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Không copy được, thử lại.');
    }
  }

  function handleSend() {
    saveStaff(info);
    queueEmail(
      studentId as string,
      {
        stageKey: stageKey as string,
        caseCode: caseCode.trim() || undefined,
        to,
        cc: [],
        bcc: bccCompany ? ['admin@mtacorporation.com'] : [],
        subject: shownSubject,
        body: isLibrary ? '' : body,
        notifyInfo: info,
        templateId: isLibrary ? currentLibraryTemplate?.id : 'stage',
        ...(isLibrary && libSubjectEdit !== null ? { templateSubject: libSubjectEdit } : {}),
        ...(isLibrary && libHtmlEdit !== null ? { templateHtml: libHtmlEdit } : {}),
      },
      student?.personal.fullName ?? to,
    );
    onClose();
  }

  const [mountedAt] = useState(() => Date.now());
  const recentDuplicate = history?.find(
    (h) =>
      h.stageKey === stageKey && h.status === 'sent' && mountedAt - new Date(h.createdAt).getTime() < 24 * 3600_000,
  );

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[95vh] w-[96vw] max-w-7xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5 sm:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LayoutTemplate size={16} />
                </span>
                <Dialog.Title className="truncate text-base font-semibold text-card-foreground">
                  Gửi mail cập nhật hồ sơ
                </Dialog.Title>
              </div>
              <Dialog.Description className="mt-0.5 truncate text-xs text-muted-foreground">
                Học sinh: <span className="font-medium text-foreground">{student?.personal.fullName}</span> ·{' '}
                {stage?.title}
                {student?.caseCode ? ` · Mã HS: ${student.caseCode}` : ''}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <X size={18} />
            </Dialog.Close>
          </div>

          {/* Body: 2-column layout */}
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[380px_1fr]">
            {/* Left sidebar: Inputs & template selector */}
            <div className="flex flex-col gap-4 overflow-y-auto border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r bg-muted/15">
              {!template && <p className="text-sm text-muted-foreground">Đang tải thông tin…</p>}

              {template && (
                <>
                  {/* Alerts */}
                  {(recentDuplicate || (student?.emailBounced && to === student.personal.personalEmail) || missing.length > 0) && (
                    <div className="flex flex-col gap-2">
                      {recentDuplicate && (
                        <p className="flex items-start gap-2 rounded-xl bg-amber-500/15 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                          <span>
                            Đã gửi mail giai đoạn này lúc{' '}
                            {new Date(recentDuplicate.createdAt).toLocaleString('vi-VN')}. Có thể gửi lại nếu cần.
                          </span>
                        </p>
                      )}
                      {student?.emailBounced && to === student.personal.personalEmail && (
                        <p className="flex items-start gap-2 rounded-xl bg-red-500/15 p-2.5 text-xs text-red-800 dark:text-red-200">
                          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
                          <span>Email học sinh từng bị trả về — vui lòng kiểm tra kỹ địa chỉ trước khi gửi.</span>
                        </p>
                      )}
                      {missing.length > 0 && (
                        <p className="flex items-start gap-2 rounded-xl bg-red-500/15 p-2.5 text-xs text-red-800 dark:text-red-200">
                          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
                          <span>
                            Còn thiếu: {missing.map((k) => MISSING_LABELS[k] ?? PLACEHOLDER_LABELS[k] ?? k).join(', ')}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Template Picker */}
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <FileText size={14} /> Chọn mẫu thư gửi
                      </label>
                      {isLibrary && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Mẫu thư viện
                        </span>
                      )}
                    </div>
                    <TemplateSearchSelect
                      options={templateOptions}
                      selectedKey={selectedTemplateKey}
                      onSelect={handleSelectTemplate}
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Bấm vào để tìm kiếm theo tên hoặc tiêu đề mẫu phù hợp nhất.
                    </p>
                  </div>

                  {/* Core Recipient & Case Details */}
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1 text-xs font-medium">
                      <span>Gửi tới (Email học sinh)</span>
                      <input
                        type="email"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder="email@example.com"
                        className={inputClass}
                      />
                    </label>

                    <label className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bccCompany}
                        onChange={(e) => setBccCompany(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>BCC bản sao về mail công ty (admin@mtacorporation.com)</span>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-medium">
                      <span>Mã hồ sơ</span>
                      <input
                        value={caseCode}
                        onChange={(e) => setCaseCode(e.target.value)}
                        onBlur={() => {
                          if (student && caseCode.trim() !== (student.caseCode ?? '')) {
                            caseCodeMutation.mutate(caseCode.trim());
                          }
                        }}
                        placeholder="Tự sinh khi gửi lần đầu hoặc nhập"
                        disabled={caseCodeMutation.isPending}
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-medium">
                      <span>Quốc gia du học</span>
                      <select
                        value={student?.studyAbroad.destinationCountry ?? ''}
                        onChange={(e) => changeCountry(e.target.value as DestinationCountry)}
                        disabled={countryMutation.isPending}
                        className={cn(inputClass, !student?.studyAbroad.destinationCountry && 'ring-2 ring-red-400')}
                      >
                        <option value="" disabled>
                          — Chọn quốc gia —
                        </option>
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* School field if applicable */}
                    {usesSchool && (
                      <label className="flex flex-col gap-1 text-xs font-medium">
                        <span>Trường dự định / nộp hồ sơ</span>
                        <input
                          key={schools[0] ?? 'empty'}
                          list="progress-email-schools"
                          defaultValue={schools[0] ?? ''}
                          onBlur={(e) => changeSchool(e.target.value.trim())}
                          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                          disabled={schoolMutation.isPending}
                          placeholder="Nhập tên trường..."
                          className={cn(inputClass, !schools.length && 'ring-2 ring-red-400')}
                        />
                        <datalist id="progress-email-schools">
                          {schools.map((u) => (
                            <option key={u} value={u} />
                          ))}
                        </datalist>
                      </label>
                    )}

                    {/* Dynamic Template Fields */}
                    {dynamicFields.map((f) => (
                      <label key={f.key} className="flex flex-col gap-1 text-xs font-medium">
                        <span>{f.label}</span>
                        <input
                          type={f.type}
                          value={info[f.key] ?? ''}
                          onChange={(e) => setInfo((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          onBlur={() => saveField(f.key)}
                          placeholder={f.placeholder}
                          className={cn(inputClass, missing.includes(f.key) && 'ring-2 ring-red-400')}
                        />
                      </label>
                    ))}
                  </div>

                  <p className="mt-auto pt-2 text-[11px] text-muted-foreground leading-normal">
                    Biến chưa điền sẽ hiển thị dạng <code>{'{{tenBien}}'}</code> để dễ kiểm tra trên bản xem trước.
                  </p>
                </>
              )}
            </div>

            {/* Right panel: Live Preview & Editor */}
            <div className="flex flex-col min-h-0 flex-1 bg-white overflow-hidden">
              {/* Preview header bar */}
              <div className="flex items-center justify-between border-b border-border bg-card/60 px-5 py-3">
                <div className="min-w-0 flex-1 mr-3 truncate text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                    Tiêu đề:
                  </span>
                  <span className="font-semibold text-foreground text-sm">{shownSubject}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editing && (
                    <button
                      type="button"
                      onClick={() => (isLibrary ? saveToLibraryMutation.mutate() : saveToStageMutation.mutate())}
                      disabled={saveToLibraryMutation.isPending || saveToStageMutation.isPending}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors',
                        syncSuccess
                          ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                          : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
                      )}
                      title="Lưu các chỉnh sửa này thành mẫu chung để đồng bộ với trang Mẫu email"
                    >
                      {syncSuccess ? <Check size={13} className="text-green-600" /> : <Save size={13} />}
                      {saveToLibraryMutation.isPending || saveToStageMutation.isPending
                        ? 'Đang lưu đồng bộ...'
                        : syncSuccess
                        ? 'Đã đồng bộ mẫu!'
                        : isLibrary
                        ? 'Lưu & đồng bộ vào Mẫu email'
                        : 'Lưu làm mẫu mặc định'}
                    </button>
                  )}
                  {isLibrary && (libSubjectEdit !== null || libHtmlEdit !== null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLibSubjectEdit(null);
                        setLibHtmlEdit(null);
                        setEditorSeed(currentLibraryTemplate?.html ?? '');
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline mr-1"
                    >
                      <RotateCcw size={12} /> Khôi phục mẫu
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!editing && isLibrary) setEditorSeed(libHtml);
                      setEditing((v) => !v);
                    }}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted shadow-2xs transition-colors"
                  >
                    {editing ? 'Quay lại xem trước' : 'Sửa nội dung'}
                  </button>
                </div>
              </div>

              {/* Preview or Editor Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {editing ? (
                  isLibrary ? (
                    <div className="flex flex-col gap-4 p-5 h-full">
                      <label className="flex flex-col gap-1.5 text-xs font-semibold">
                        <span>Tiêu đề email</span>
                        <input
                          value={libSubject}
                          onChange={(e) => setLibSubjectEdit(e.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <div className="flex flex-1 flex-col gap-1.5 text-xs font-semibold min-h-0">
                        <span>Nội dung thư</span>
                        <VisualEmailEditor key={editorSeed} initialHtml={editorSeed} onChange={setLibHtmlEdit} />
                        <span className="text-[11px] font-normal text-muted-foreground">
                          Bấm trực tiếp vào chữ trong thư để sửa. Nếu muốn cập nhật vào kho mẫu gốc để các lần gửi sau cũng dùng, hãy bấm nút <strong>&quot;Lưu &amp; đồng bộ vào Mẫu email&quot;</strong> ở góc trên bên phải.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 p-5 h-full">
                      <label className="flex flex-col gap-1.5 text-xs font-semibold">
                        <span>Tiêu đề email</span>
                        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
                      </label>
                      <label className="flex flex-1 flex-col gap-1.5 text-xs font-semibold min-h-0">
                        <span>Nội dung thư</span>
                        <textarea
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          rows={16}
                          className={cn(inputClass, 'flex-1 font-mono text-xs leading-relaxed resize-y')}
                        />
                        <span className="text-[11px] font-normal text-muted-foreground">
                          Dùng định dạng Markdown: **chữ đậm**, &quot;- &quot; cho gạch đầu dòng.
                        </span>
                      </label>
                    </div>
                  )
                ) : (
                  <iframe
                    title="Xem trước mail"
                    sandbox="allow-popups allow-same-origin"
                    srcDoc={previewHtml}
                    className="h-full min-h-[560px] w-full border-0 bg-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-6 bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy('subject')}
                disabled={!to || missing.length > 0}
                title="Copy tiêu đề vào clipboard"
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {copied === 'subject' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied === 'subject' ? 'Đã copy' : 'Copy tiêu đề'}
              </button>
              <button
                type="button"
                onClick={() => handleCopy('body')}
                disabled={!to || missing.length > 0}
                title="Copy nội dung HTML để dán vào Gmail / Outlook"
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {copied === 'body' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied === 'body' ? 'Đã copy' : 'Copy nội dung'}
              </button>
              {copyError && <span className="text-xs text-red-500">{copyError}</span>}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!template || !to || missing.length > 0}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-95 disabled:opacity-50 transition-all shadow-sm"
              >
                <Send size={15} />
                Gửi mail
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
