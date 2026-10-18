// Links progress-email stages to templates of the /email-templates library.
// Shared by the popup preview and the server sender so both fill the same values the same way.

// Stage preset → library template (seedKey). Stages not listed keep the built-in letter.
export const STAGE_LIBRARY_KEY: Record<string, string> = {
  gd1_hop_dong: 'thank-you-catholic-mta',
  gd2_nop_ho_so: 'school-application-submitted',
  gd3_i20_visa: 'progress-preview',
  gd4_luyen_pv: 'practice-schedule',
  gd5_lich_pv: 'interview-schedule',
};

// Library placeholder → the popup field (NOTIFY_FIELDS key) it is read from, so the popup knows what to ask for.
export const LIBRARY_FIELD_SOURCE: Record<string, string> = {
  tenPhuHuynh: 'tenPhuHuynh',
  ngayTiepNhan: 'ngayKyHopDong',
  ngayCapThu: 'ngayCapI20',
  ngayPhongVan: 'lichPhongVan',
  gioPhongVan: 'lichPhongVan',
};

import { dropParentWording, isParentOptionalKey } from '@/lib/notifications/parent-wording';

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// "2026-10-19T10:30" → "10:30 sáng" (24h clock → sáng / chiều / tối).
export function timeOfDay(value?: string) {
  const m = value?.match(/T(\d{2}):(\d{2})/);
  if (!m) return '';
  const h = Number(m[1]);
  return `${m[1]}:${m[2]} ${h < 12 ? 'sáng' : h < 18 ? 'chiều' : 'tối'}`;
}

// "2026-10-19" or "2026-10-19T10:30" → "19/10/2026".
export function dateOf(value?: string) {
  const m = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (value?.trim() ?? '');
}

// vars = student vars (maHoSo, tenHocSinh, truong, quocGia, …) + staff-entered notifyInfo.
export function libraryValues(vars: Record<string, string | undefined>): Record<string, string> {
  const cleanVars = Object.fromEntries(
    Object.entries(vars).filter(([, v]) => v !== undefined && v !== null)
  ) as Record<string, string>;
  return {
    ...cleanVars,
    tenHocSinh: vars.tenHocSinh ?? '',
    tenPhuHuynh: vars.tenPhuHuynh ?? '',
    maHoSo: vars.maHoSo ?? '',
    tenTruong: vars.truong ?? vars.tenTruong ?? '',
    quocGia: vars.quocGia ?? '',
    ngayTiepNhan: dateOf(vars.ngayKyHopDong) || vars.ngayTiepNhan || '',
    ngayCapThu: dateOf(vars.ngayCapI20 || vars.ngayCapThuMoi) || vars.ngayCapThu || '',
    ngayPhongVan: dateOf(vars.lichPhongVan) || vars.ngayPhongVan || '',
    gioPhongVan: timeOfDay(vars.lichPhongVan) || vars.gioPhongVan || '',
  };
}

export function missingLibraryValues(texts: string[], values: Record<string, string>) {
  const missing = new Set<string>();
  for (const text of texts) for (const [, key] of text.matchAll(PLACEHOLDER)) if (!values[key]?.trim() && !isParentOptionalKey(key)) missing.add(key);
  return [...missing];
}

export function fillLibraryText(text: string, values: Record<string, string>, asHtml = false) {
  const src = values.tenPhuHuynh?.trim() ? text : dropParentWording(text);
  return src.replace(PLACEHOLDER, (raw, key: string) => {
    const v = values[key]?.trim();
    return v ? (asHtml ? escapeHtml(v) : v) : raw;
  });
}

export function libraryHtmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<\/(p|div|tr|h\d)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}
