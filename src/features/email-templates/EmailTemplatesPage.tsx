'use client';

import { useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Mail, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { emailTemplateApi } from './email-template.api';
import type { EmailTemplate, EmailTemplateInput } from './email-template.types';
import { fillLibraryText } from '@/lib/email-templates/stage-library';
import { copyEmailHtml } from '@/features/notifications/copyEmail';
import { composerFor } from '@/lib/email-templates/composers';
import { ComposerDialog } from './ComposerDialog';
import { EMAIL_FOOTER, FOOTER_CSS } from '@/lib/email-templates/footer';
import { EMAIL_SIGNATURE } from '@/lib/email-templates/signature';

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';

const previewFields = [
  { key: 'tenHocSinh', label: 'Tên học sinh', placeholder: 'Nguyễn Văn An' },
  { key: 'tenPhuHuynh', label: 'Tên phụ huynh', placeholder: 'Nguyễn Văn Bình' },
  { key: 'maHoSo', label: 'Mã hồ sơ', placeholder: 'MTA-2026-0001' },
  { key: 'tenTruong', label: 'Tên trường', placeholder: 'Tên trường' },
  { key: 'quocGia', label: 'Quốc gia', placeholder: 'Mỹ, Canada, Úc...' },
  { key: 'ngayTiepNhan', label: 'Ngày tiếp nhận', placeholder: '04/10/2026' },
  { key: 'ngayCapThu', label: 'Ngày cấp thư', placeholder: '04/10/2026' },
  { key: 'ngayPhongVan', label: 'Ngày phỏng vấn', placeholder: '19/10/2026' },
  { key: 'gioPhongVan', label: 'Giờ phỏng vấn', placeholder: '10:30 sáng' },
  { key: 'tuNgay', label: 'Thực hành từ ngày', placeholder: '05/10/2026' },
  { key: 'denNgay', label: 'Thực hành đến ngày', placeholder: '10/10/2026' },
  { key: 'ngayBuoi1', label: 'Ngày buổi 1', placeholder: '06/10/2026' },
  { key: 'thuBuoi1', label: 'Thứ buổi 1', placeholder: 'Thứ Ba' },
  { key: 'gioBuoi1', label: 'Giờ buổi 1', placeholder: '09:00 sáng' },
  { key: 'ngayBuoi2', label: 'Ngày buổi 2', placeholder: '08/10/2026' },
  { key: 'thuBuoi2', label: 'Thứ buổi 2', placeholder: 'Thứ Năm' },
  { key: 'gioBuoi2', label: 'Giờ buổi 2', placeholder: '09:00 sáng' },
  { key: 'ngayBuoi3', label: 'Ngày buổi 3', placeholder: '09/10/2026' },
  { key: 'thuBuoi3', label: 'Thứ buổi 3', placeholder: 'Thứ Sáu' },
  { key: 'gioBuoi3', label: 'Giờ buổi 3', placeholder: '09:00 sáng' },
  { key: 'hinhThuc', label: 'Hình thức thực hành', placeholder: 'Google Meet' },
  { key: 'mentor', label: 'Mentor', placeholder: 'Trần Ngọc Duyên' },
  { key: 'noiDungLuyenTap', label: 'Nội dung luyện tập', placeholder: 'Thực hành các câu hỏi phỏng vấn thường gặp...' },
  { key: 'noiDungBoSung1', label: 'Nội dung cần bổ sung 1', placeholder: 'Bản scan hộ chiếu...' },
  { key: 'noiDungBoSung2', label: 'Nội dung cần bổ sung 2', placeholder: 'Thông tin lịch sử du lịch...' },
  { key: 'noiDungBoSung3', label: 'Nội dung cần bổ sung 3', placeholder: 'Thông tin người thân tại Hoa Kỳ...' },
] as const;

function createDefaultTemplateHtml(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <title>[Catholic MTA] {{tenHocSinh}}</title>
  <style>
    ${FOOTER_CSS}
  </style>
</head>
<body style="margin:0;padding:0;background:#eef2f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#222a35;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f8;">
    <tr>
      <td align="center" style="padding:24px 8px;">
        <table role="presentation" width="660" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:660px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Top Color Bar -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="45%" height="5" bgcolor="#1b4f9c" style="background:#1b4f9c;height:5px;"></td>
                  <td bgcolor="#f39422" style="background:#f39422;height:5px;"></td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Header Logo -->
          <tr>
            <td align="center" style="padding:32px 8% 24px;">
              <img src="/email/logo.png" alt="Catholic MTA" width="280" style="display:block;border:0;width:280px;max-width:100%;height:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:0 8%;">
              <div style="border-top:1px solid #e3e8f0;"></div>
            </td>
          </tr>
          <!-- Header Title -->
          <tr>
            <td align="center" style="padding:24px 35px 20px;">
              <div style="font-size:11px;line-height:18px;font-weight:bold;letter-spacing:2px;color:#f39422;">—&nbsp;&nbsp; THÔNG BÁO &nbsp;&nbsp;—</div>
              <div style="padding-top:8px;font-size:24px;line-height:34px;font-weight:800;color:#14305f;">TIÊU ĐỀ THƯ THÔNG BÁO</div>
            </td>
          </tr>
          <!-- Email Content -->
          <tr>
            <td style="padding:0 8% 28px;font-size:14px;line-height:23px;color:#222a35;">
              <p style="margin:0 0 18px;">Kính gửi Quý Phụ huynh và em <strong style="color:#14305f;">{{tenHocSinh}}</strong>,</p>
              <p style="margin:0 0 18px;text-align:justify;">Công ty TNHH Tư vấn Du học Catholic MTA xin gửi đến Quý Phụ huynh và em <strong>{{tenHocSinh}}</strong> thông tin cập nhật mới nhất...</p>
              <p style="margin:0 0 18px;text-align:justify;">Nội dung chi tiết thông báo tại đây.</p>
              <p style="margin:0 0 16px;">Trân trọng,</p>
              ${EMAIL_SIGNATURE}
            </td>
          </tr>
          <!-- Auto Email Notice -->
          <tr>
            <td align="center" style="padding:10px 3% 26px;font-size:11.5px;line-height:22px;">
              <span style="background:#f6e6b4;color:#14305f;font-weight:bold;font-style:italic;padding:4px 8px;border-radius:4px;">Đây là thư thông báo tự động từ chúng tôi. Quý khách vui lòng không phản hồi trực tiếp thư này.</span>
            </td>
          </tr>
          ${EMAIL_FOOTER}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const blankTemplate: EmailTemplateInput = {
  name: '',
  subject: '[Catholic MTA] ',
  html: createDefaultTemplateHtml(),
};

// Same filler as the send popup and the server sender (stage-library), so every path renders identically.
const fillVariables = (text: string, values: Record<string, string>) => fillLibraryText(text, values, true);
const fillTextVariables = (text: string, values: Record<string, string>) => fillLibraryText(text, values);

export function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EmailTemplate | 'new' | null>(null);
  const [previewing, setPreviewing] = useState<EmailTemplate | null>(null);
  const [composing, setComposing] = useState<EmailTemplate | null>(null);
  const [notice, setNotice] = useState('');
  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ['email-templates'],
    queryFn: emailTemplateApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: emailTemplateApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
  });

  async function remove(template: EmailTemplate) {
    if (!confirm(`Xóa mẫu “${template.name}”? Thao tác này không thể hoàn tác.`)) return;
    await deleteMutation.mutateAsync(template.id);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mẫu email</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lưu, chỉnh sửa và điền thông tin trước khi sao chép email để gửi.</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95"
        >
          <Plus size={16} /> Thêm mẫu email
        </button>
      </div>

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span>{notice}</span><button onClick={() => setNotice('')} aria-label="Đóng"><X size={15} /></button>
        </div>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Đang tải mẫu email...</p>}
      {isError && <p className="text-sm text-red-600">Không tải được mẫu email.</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        {(templates ?? []).map((template) => (
          <article key={template.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Mail size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-card-foreground">{template.name}</h2>
                  {template.isBuiltIn && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Mẫu ban đầu</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{template.subject}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => (composerFor(template) ? setComposing(template) : setPreviewing(template))} className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                Điền tên &amp; sao chép
              </button>
              <button onClick={() => setEditing(template)} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
                <Pencil size={14} /> Chỉnh sửa
              </button>
              {!template.isBuiltIn && (
                <button onClick={() => remove(template)} className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 size={14} /> Xóa
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {templates?.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Chưa có mẫu email nào.</p>}

      <EditorDialog template={editing} onClose={() => setEditing(null)} />
      <ComposerDialog template={composing} onClose={() => setComposing(null)} onNotice={setNotice} />
      <PreviewDialog template={previewing} onClose={() => setPreviewing(null)} onNotice={setNotice} />
    </div>
  );
}

function EditorDialog({ template, onClose }: { template: EmailTemplate | 'new' | null; onClose: () => void }) {
  return (
    <Dialog.Root open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        {template && <EditorForm key={template === 'new' ? 'new' : template.id} template={template} onClose={onClose} />}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditorForm({ template, onClose }: { template: EmailTemplate | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const initial = template === 'new' ? blankTemplate : template;
  const [form, setForm] = useState<EmailTemplateInput>({ name: initial.name, subject: initial.subject, html: initial.html });
  const [mobileTab, setMobileTab] = useState<'info' | 'preview'>('info');
  // The preview iframe is edited in place (click text, type). Its document is the live editor, so it is only
  // reloaded when the HTML textarea changes, never from its own edits (that would reset the caret).
  const [seed, setSeed] = useState({ html: initial.html, rev: 0 });
  const frameRef = useRef<HTMLIFrameElement>(null);

  function enableInlineEdit() {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body) return;

    // designMode is more reliable than body.contentEditable alone in Chromium
    // variants (including Cốc Cốc) when the editable document lives in srcDoc.
    doc.designMode = 'on';
    doc.body.contentEditable = 'true';
    doc.body.style.outline = 'none';
    doc.body.style.cursor = 'text';

    const serialize = () => {
      const clone = doc.documentElement.cloneNode(true) as HTMLElement;
      clone.querySelector('body')?.removeAttribute('contenteditable');
      clone.querySelector('body')?.removeAttribute('style');
      return `<!DOCTYPE html>\n${clone.outerHTML}`;
    };

    const syncHtml = () => setForm((current) => ({ ...current, html: serialize() }));
    doc.addEventListener('input', syncHtml);
    doc.addEventListener('blur', syncHtml, true);
  }
  const mutation = useMutation({
    mutationFn: () => template === 'new' ? emailTemplateApi.create(form) : emailTemplateApi.update(template.id, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      onClose();
    },
  });

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[94vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <Dialog.Title className="text-base font-semibold">{template === 'new' ? 'Thêm mẫu email' : 'Chỉnh sửa mẫu email'}</Dialog.Title>
        <Dialog.Close aria-label="Đóng"><X size={19} /></Dialog.Close>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex border-b border-border bg-muted/40 p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('info')}
          className={`flex-1 rounded-xl py-2 text-center text-xs font-semibold transition-all ${
            mobileTab === 'info' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Thông tin
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 rounded-xl py-2 text-center text-xs font-semibold transition-all ${
            mobileTab === 'preview' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Nội dung thư
        </button>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
        <div className={`flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-5 border-b border-border lg:border-b-0 lg:border-r ${
          mobileTab !== 'info' ? 'hidden lg:flex' : 'flex'
        }`}>
          <label className="text-xs font-semibold">Tên mẫu
            <input className={`${inputClass} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-xs font-semibold">Tiêu đề email
            <input className={`${inputClass} mt-1`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>

          <details className="group rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground transition">
            <summary className="cursor-pointer font-medium text-foreground hover:text-primary list-none flex items-center justify-between">
              <span>Chỉnh sửa mã HTML nguồn</span>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3">
              <textarea
                className={`${inputClass} min-h-[200px] w-full resize-y font-mono text-xs leading-relaxed`}
                value={form.html}
                onChange={(e) => {
                  setForm({ ...form, html: e.target.value });
                  setSeed((v) => ({ html: e.target.value, rev: v.rev + 1 }));
                }}
              />
            </div>
          </details>
        </div>

        <div className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-white ${
          mobileTab !== 'preview' ? 'hidden lg:flex' : 'flex'
        }`}>
          <iframe
            key={seed.rev}
            ref={frameRef}
            onLoad={enableInlineEdit}
            title="Xem trước mẫu email"
            srcDoc={seed.html}
            className="h-full w-full flex-1 border-0 bg-white"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5 sm:py-4 bg-card">
        {mutation.isError && <span className="mr-auto text-xs text-red-600">Không lưu được mẫu.</span>}
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Hủy</button>
        <button
          onClick={() => mutation.mutate()}
          disabled={!form.name.trim() || !form.subject.trim() || !form.html.trim() || mutation.isPending}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 shadow-xs"
        ><Save size={14} /> {mutation.isPending ? 'Đang lưu...' : 'Lưu mẫu'}</button>
      </div>
    </Dialog.Content>
  );
}

function PreviewDialog({ template, onClose, onNotice }: { template: EmailTemplate | null; onClose: () => void; onNotice: (message: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copying, setCopying] = useState(false);
  const [mobileTab, setMobileTab] = useState<'info' | 'preview'>('info');
  const renderedHtml = useMemo(() => template ? fillVariables(template.html, values) : '', [template, values]);
  const renderedSubject = useMemo(() => template ? fillTextVariables(template.subject, values) : '', [template, values]);

  // Show only fields used by this template. Empty values intentionally leave
  // their {{variable}} markers intact so staff can fill them after pasting.
  const usedFields = useMemo(() => {
    const text = template ? `${template.subject} ${template.html}` : '';
    return previewFields.filter((f) => text.includes(`{{${f.key}}}`));
  }, [template]);

  async function copyEmail() {
    setCopying(true);
    try {
      // Copy only the rendered body fragment. Supplying a complete HTML document
      // can make Chromium-based mail editors paste both the document and fragment.
      await copyEmailHtml(renderedHtml);
      onNotice('Đã sao chép nội dung email.');
      onClose();
    } catch {
      onNotice('Trình duyệt không cho phép sao chép định dạng.');
    } finally {
      setCopying(false);
    }
  }

  async function copySubject() {
    await navigator.clipboard.writeText(renderedSubject);
    onNotice('Đã sao chép tiêu đề email.');
  }

  return (
    <Dialog.Root open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        {template && (
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[94vh] w-[96vw] max-w-7xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <Dialog.Title className="text-base font-semibold">{template.name}</Dialog.Title>
              <Dialog.Close aria-label="Đóng"><X size={19} /></Dialog.Close>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex border-b border-border bg-muted/40 p-1 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileTab('info')}
                className={`flex-1 rounded-xl py-2 text-center text-xs font-semibold transition-all ${
                  mobileTab === 'info' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Thông tin
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className={`flex-1 rounded-xl py-2 text-center text-xs font-semibold transition-all ${
                  mobileTab === 'preview' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Xem trước thư
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[320px_1fr]">
              <div className={`space-y-3 overflow-y-auto border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r bg-muted/15 ${
                mobileTab !== 'info' ? 'hidden lg:block' : 'block'
              }`}>
                {usedFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Mẫu này không có trường biến cần điền trước.</p>
                ) : (
                  usedFields.map((field) => (
                    <label key={field.key} className="block text-xs font-medium">
                      <span>{field.label}</span>
                      <input
                        className={`${inputClass} mt-1`}
                        placeholder={field.placeholder}
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                      />
                    </label>
                  ))
                )}
              </div>
              <div className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-white ${
                mobileTab !== 'preview' ? 'hidden lg:flex' : 'flex'
              }`}>
                <iframe
                  title="Email đã điền"
                  sandbox="allow-popups allow-same-origin"
                  srcDoc={renderedHtml}
                  className="h-full w-full flex-1 border-0 bg-white"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5 sm:py-3.5 bg-card">
              <div className="min-w-0 flex-1 truncate text-xs sm:text-sm">
                <span className="text-muted-foreground mr-1">Tiêu đề:</span>
                <span className="font-semibold text-foreground">{renderedSubject}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copySubject}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Copy tiêu đề
                </button>
                <button
                  type="button"
                  onClick={copyEmail}
                  disabled={copying}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-95 disabled:opacity-50 transition-all shadow-xs"
                >
                  <Copy size={14} /> {copying ? 'Đang sao chép...' : 'Sao chép để gửi'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
