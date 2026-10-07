import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { EmailTemplate } from '@/models/EmailTemplate';
import { upgradeFooter } from './footer';
import { upgradeSignature } from './signature';

const DEFAULTS = [
  {
    seedKey: 'thank-you-catholic-mta',
    file: 'thu-cam-on-catholic-mta-georgia-italic.html',
    name: 'Thư cảm ơn Catholic MTA',
    replacements: [
      ['Huỳnh Hoàng Vũ', '{{tenHocSinh}}'],
      ['Huỳnh Phát', '{{tenPhuHuynh}}'],
      ['MTA-2026-0001', '{{maHoSo}}'],
      ['02/10/2026', '{{ngayTiepNhan}}'],
      ['hồ sơ du học Mỹ', 'hồ sơ du học {{quocGia}}'],
      ['>Mỹ<', '>{{quocGia}}<'],
      ['Hồ sơ du học Mỹ', 'Hồ sơ du học {{quocGia}}'],
    ],
  },
  {
    seedKey: 'progress-preview',
    file: 'xem-truoc.html',
    name: 'Cập nhật tiến độ hồ sơ',
    replacements: [
      ['[Tên học sinh]', '{{tenHocSinh}}'],
      ['[Tên trường]', '{{tenTruong}}'],
      ['[dd/mm/yyyy]', '{{ngayCapThu}}'],
    ],
  },
  {
    seedKey: 'interview-schedule',
    file: 'thong-bao-lich-phong-van.html',
    name: 'Thông báo lịch phỏng vấn',
    replacements: [
      ['Phan Anh Kiệt', '{{tenHocSinh}}'],
      ['19/10/2026', '{{ngayPhongVan}}'],
      ['10:30 sáng', '{{gioPhongVan}}'],
    ],
  },
  {
    seedKey: 'practice-schedule',
    file: 'thong-bao-lich-luyen-tap-phong-van.html',
    name: 'Lịch thực hành phỏng vấn',
    replacements: [],
  },
  {
    seedKey: 'offer-letter-congrats',
    file: 'thu-chuc-mung-nhan-offer-letter.html',
    name: 'Thư chúc mừng nhận Offer Letter từ trường',
    replacements: [],
  },
  {
    seedKey: 'ds160-document-reminder',
    file: 'nhac-bo-sung-ho-so-ds160.html',
    name: 'Nhắc bổ sung hồ sơ DS-160',
    replacements: [],
  },
  {
    seedKey: 'school-application-submitted',
    file: 'cap-nhat-ho-so-da-nop-truong.html',
    name: 'Cập nhật hồ sơ đã nộp đến trường',
    replacements: [],
  },
] as const;

function titleOf(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'Mẫu email Catholic MTA';
}

// Signature logo is the emblem; earlier seeded copies still point at logo.png.
const OLD_SIGNATURE_LOGO = '<img src="/email/logo.png" alt="Catholic MTA" width="180"';
const NEW_SIGNATURE_LOGO = '<img src="/email/emblem.png" alt="Catholic MTA" width="180"';

// Gmail auto-links "Hoa Kỳ:" as a map address in default blue; an explicit link keeps the orange label.
const OLD_US_LABEL = '<strong style="color:#f39422;">Hoa Kỳ:</strong>';
const NEW_US_LABEL =
  '<strong><a href="https://www.google.com/maps/search/?api=1&amp;query=8107+Bolsa+Ave%2C+Midway+City%2C+CA+92655" target="_blank" style="color:#f39422;text-decoration:none;">Hoa Kỳ:</a></strong>';

// Signature emblem was 160px wide; the lighter 130px size is idempotent (copies already resized are untouched).
function shrinkSignatureEmblem(html: string) {
  return html.replace(/<img src="\/email\/emblem\.png"[^>]*>/g, (tag) =>
    tag.replace('width="160"', 'width="130"').replace('height="127"', 'height="103"').replace('width:160px', 'width:130px').replace('max-width:160px', 'max-width:130px')
  );
}

// The repair/seed pass below costs ~10 round trips to Mongo, so run it once per server instance, not on every
// list request (it made /email-templates take ~4s to load). A failed pass is retried on the next call.
let ensured: Promise<void> | null = null;

export function ensureDefaultEmailTemplates() {
  ensured ??= runEnsureDefaults().catch((error) => {
    ensured = null;
    throw error;
  });
  return ensured;
}

async function runEnsureDefaults() {
  const stale = await EmailTemplate.find({
    $or: [{ html: { $regex: 'logo\\.png" alt="Catholic MTA" width="180"' } }, { html: { $regex: 'color:#f39422;">Hoa Kỳ:' } }],
  });
  for (const t of stale) {
    t.html = t.html.replaceAll(OLD_SIGNATURE_LOGO, NEW_SIGNATURE_LOGO).replaceAll(OLD_US_LABEL, NEW_US_LABEL);
    await t.save();
  }

  // Roll the shared signature and footer out to stored built-in copies. Both upgrades are idempotent.
  for (const t of await EmailTemplate.find({ seedKey: { $exists: true, $ne: null } })) {
    const upgraded = upgradeFooter(t.html);
    const signed = upgradeSignature(upgraded.html);
    const resized = shrinkSignatureEmblem(signed.html);
    if (upgraded.changed || signed.changed || resized !== signed.html) {
      t.html = resized;
      await t.save();
    }
  }

  // Replace only the legacy practice template. Staff-edited copies of the new
  // design are left alone because they no longer contain the old {{buoi1}} field.
  // Also covers the fixed 3-session version ({{ngayBuoi1}}), replaced by the repeatable-rows design.
  const legacyPractice = await EmailTemplate.findOne({
    seedKey: 'practice-schedule',
    // The 4-column row layout (calendar-icon cell, width="9%") is replaced by the fluid one as well.
    html: { $regex: '\\{\\{(buoi1|ngayBuoi1)\\}\\}|<td width="9%"' },
  });
  if (legacyPractice) {
    const html = await readFile(path.join(process.cwd(), 'email-templates', 'thong-bao-lich-luyen-tap-phong-van.html'), 'utf8');
    legacyPractice.name = 'Lịch thực hành phỏng vấn';
    legacyPractice.subject = titleOf(html);
    legacyPractice.html = html;
    await legacyPractice.save();
  }

  const present = new Set((await EmailTemplate.find({ seedKey: { $in: DEFAULTS.map((d) => d.seedKey) } }, 'seedKey').lean()).map((t) => t.seedKey));
  for (const item of DEFAULTS) {
    if (present.has(item.seedKey)) continue;
    try {
      let html = await readFile(path.join(process.cwd(), 'email-templates', item.file), 'utf8');
      html = upgradeFooter(html).html;
      html = upgradeSignature(html).html;
      for (const [from, to] of item.replacements) html = html.replaceAll(from, to);
      await EmailTemplate.updateOne(
        { seedKey: item.seedKey },
        { $setOnInsert: { seedKey: item.seedKey, name: item.name, subject: titleOf(html), html } },
        { upsert: true }
      );
    } catch (error) {
      console.warn(`Không thể nhập mẫu email ${item.file}`, error);
    }
  }
}
