import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';

// Imports students from the contract workbook (exported with scripts/excel-to-json.py).
//
//   python scripts/excel-to-json.py "<workbook>.xlsx" scratch/contracts.json
//   IMPORT_TARGET_URL=mongodb://.../thucsys npx tsx scripts/import-contracts.ts --file=scratch/contracts.json          (dry run)
//   IMPORT_TARGET_URL=mongodb://.../thucsys npx tsx scripts/import-contracts.ts --file=scratch/contracts.json --yes    (writes)
//
// Rules: people already in the database (same name) are skipped untouched, repeats inside the workbook keep only
// the first row, rows with Status "Huỷ" and contract addenda are not imported, money columns are never read.

type Row = (string | null)[];

// Sheet "Quản lí hợp đồng" (A) and "Xử lý hồ sơ (New)" (B) column positions.
const A = { code: 1, signed: 3, name: 4, phone: 5, email: 6, destination: 8, service: 9, level: 10, school: 11, sale2: 29, sale1: 30 };
const B = {
  name: 0, code: 1, signed: 2, service: 3, destination: 4, school: 5, majorLink: 6, intake: 7, checklist: 8, strategy: 9,
  status: 10, subStatus: 11, note: 12, csNote: 13, dob: 14, gender: 15, address: 16, studentEmail: 17,
  fatherName: 18, fatherPhone: 19, fatherEmail: 20, motherName: 21, motherPhone: 22, motherEmail: 23,
  sponsorName: 24, sponsorPhone: 25, sponsorEmail: 26, currentSchool: 27, grade: 28, gpa: 29, english: 30, gap: 31,
  job: 32, income: 33, assets: 34, sales: 35, processStaff: 36, visaDate: 37, tuition: 38, invoice: 39,
};

const SERVICE: Record<string, string> = {
  'du hoc': 'du_hoc', 'du hoc he': 'du_hoc_he', onshore: 'onshore', 'du hoc onshore': 'onshore',
  'gia han visa': 'gia_han_visa', 'du lich': 'du_lich', 'dinh cu': 'dinh_cu',
};
const COUNTRY: Record<string, string> = { my: 'USA', canada: 'Canada', 'new zealand': 'NewZealand', duc: 'Germany', phap: 'France' };

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Old "HD2026…" codes and the newer "20260524/HĐDVDH/US" form; anything else (a stray cell) is not stored as a code.
const CONTRACT_CODE = /^(HD\s?\d+|\d{6,}\/H)/i;

const IMPORT_BATCH = 'contracts-2026-10-07';

const get = (row: Row | undefined, i: number) => row?.[i] ?? undefined;

// "Chi Nguyễn Thị Út (Mẹ Em Học Sinh X)" → person "Nguyễn Thị Út", relative text "Mẹ Em Học Sinh X".
function splitName(raw: string) {
  const text = raw.replace(/\s+/g, ' ').trim();
  const paren = text.match(/\(([^)]*)\)/)?.[1]?.trim();
  const main = text.replace(/\([^)]*\)/g, '').trim().replace(/^(chi|bà|ba|ông|cha|hs|học sinh)\s+/i, '').trim();
  return { main, paren };
}

function relative(paren?: string): { kind: 'mother' | 'father'; name: string } | undefined {
  if (!paren) return undefined;
  const m = paren.match(/^(mẹ|me|ba|bố|bo|cha)\s+(?:của\s+)?(?:em\s+)?(?:hs\s+|học sinh\s+)?(.+)$/i);
  if (!m) return undefined;
  const kind = /^(mẹ|me)$/i.test(m[1]) ? 'mother' : 'father';
  return { kind, name: m[2].trim() };
}

// "09/2026" → { term: 'Tháng 09', year: 2026 }; anything else stays as free text.
function intake(raw?: string) {
  const m = raw?.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return { term: `Tháng ${m[1].padStart(2, '0')}`, year: Number(m[2]) };
  return raw ? { term: raw } : {};
}

// "9/7/2026" (day/month/year) or ISO.
function toDate(raw?: string) {
  if (!raw) return undefined;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]));
  return undefined;
}

function main() {
  return run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

async function run() {
  const uri = process.env.IMPORT_TARGET_URL;
  if (!uri) throw new Error('IMPORT_TARGET_URL is not set.');
  const file = process.argv.find((a) => a.startsWith('--file='))?.slice(7);
  if (!file) throw new Error('Pass --file=<json made by excel-to-json.py>.');
  const write = process.argv.includes('--yes');
  const { contracts, processing } = JSON.parse(await readFile(file, 'utf8')) as { contracts: Row[]; processing: Row[] };

  const contractByCode = new Map<string, Row>();
  for (const row of contracts) if (row[A.code]) contractByCode.set(row[A.code]!, row);

  // Candidates: every processing row, then contract rows that have no processing row.
  const usedCodes = new Set<string>();
  const candidates: Array<{ b?: Row; a?: Row; source: string }> = [];
  for (const b of processing) {
    const code = get(b, B.code);
    if (code) usedCodes.add(code);
    candidates.push({ b, a: code ? contractByCode.get(code) : undefined, source: 'Xử lý hồ sơ' });
  }
  // The two sheets write the same contract differently (HD20260525 vs 20260525/HĐDVDH/US), so a contract row that
  // matches no code is attached to the processing row with the same person name before it is treated as a new person.
  for (const a of contracts) {
    if (!a[A.code] || usedCodes.has(a[A.code]!)) continue;
    const name = fold(splitName(a[A.name] ?? '').main);
    const twin = candidates.find((c) => c.b && !c.a && fold(String(get(c.b, B.name) ?? '')) === name);
    if (twin) twin.a = a;
    else candidates.push({ a, source: 'Quản lí hợp đồng' });
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(new URL(uri).pathname.replace(/^\//, '') || 'thucsys');
  const students = db.collection('students');
  const existing = new Set((await students.find({}, { projection: { fullName: 1 } }).toArray()).map((s) => fold(String(s.fullName ?? ''))));

  const report = { toCreate: 0, skippedExisting: [] as string[], skippedRepeat: [] as string[], skippedCancelled: [] as string[], skippedOther: [] as string[], unknownCountry: [] as string[] };
  const seen = new Set<string>();
  const docs: Record<string, unknown>[] = [];

  for (const { b, a } of candidates) {
    const rawName = get(b, B.name) ?? get(a, A.name);
    const code = get(b, B.code) ?? get(a, A.code);
    if (!rawName) { report.skippedOther.push(`(không tên) ${code ?? ''}`); continue; }
    if (/phụ lục/i.test(`${rawName} ${code ?? ''}`)) { report.skippedOther.push(`${rawName.replace(/\s+/g, ' ')} – phụ lục hợp đồng`); continue; }
    if (get(b, B.status)?.toLowerCase().startsWith('hu')) { report.skippedCancelled.push(`${rawName} (${code ?? ''})`); continue; }

    const { main: nameA, paren } = splitName(rawName);
    const fullName = get(b, B.name) ? get(b, B.name)!.replace(/\s+/g, ' ').trim() : nameA;
    const key = fold(fullName);
    if (existing.has(key)) { report.skippedExisting.push(fullName); continue; }
    if (seen.has(key)) { report.skippedRepeat.push(`${fullName} (${code ?? ''})`); continue; }
    seen.add(key);

    const serviceRaw = get(b, B.service) ?? get(a, A.service);
    const destRaw = get(b, B.destination) ?? get(a, A.destination);
    const destination = destRaw ? COUNTRY[fold(destRaw)] : undefined;
    const notes: string[] = [];
    if (get(b, B.note)) notes.push(get(b, B.note)!);
    if (destRaw && !destination) {
      notes.push(`Điểm đến theo Excel: ${destRaw}`);
      report.unknownCountry.push(`${fullName}: ${destRaw}`);
    }
    const rel = relative(paren);
    const take = intake(get(b, B.intake));
    const school = get(b, B.school) ?? get(a, A.school);
    const gpa = Number(get(b, B.gpa)?.replace(',', '.'));
    const sale = get(b, B.sales) ?? get(a, A.sale1) ?? get(a, A.sale2);
    const gender = get(b, B.gender)?.toLowerCase();

    const doc: Record<string, unknown> = {
      fullName,
      importBatch: IMPORT_BATCH, // lets the whole import be undone: deleteMany({ importBatch })
      stage: 'hop_dong',
      stageOrder: 0,
      notifyInfo: {},
      preferredUniversities: school ? [school] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(code && CONTRACT_CODE.test(code) && { contractCode: code.replace(/\s+/g, ' ') }),
      ...(toDate(get(b, B.signed) ?? get(a, A.signed)) && { contractDate: toDate(get(b, B.signed) ?? get(a, A.signed)) }),
      ...(serviceRaw && SERVICE[fold(serviceRaw)] && { serviceType: SERVICE[fold(serviceRaw)] }),
      ...(destination && { destinationCountry: destination }),
      ...(get(a, A.phone) && { phone: get(a, A.phone) }),
      ...((get(b, B.studentEmail) ?? get(a, A.email)) && { personalEmail: (get(b, B.studentEmail) ?? get(a, A.email))!.toLowerCase() }),
      ...(toDate(get(b, B.dob)) && { dateOfBirth: toDate(get(b, B.dob)) }),
      ...(gender?.startsWith('nam') && { gender: 'male' }),
      ...(gender?.startsWith('n') && !gender.startsWith('nam') && { gender: 'female' }),
      ...(get(b, B.address) && { address: get(b, B.address) }),
      ...(get(b, B.currentSchool) && { schoolName: get(b, B.currentSchool) }),
      ...(get(b, B.grade) && { currentGrade: get(b, B.grade) }),
      ...(get(a, A.level) && !get(b, B.grade) && { currentGrade: get(a, A.level) }),
      ...(Number.isFinite(gpa) && gpa > 0 && { gpa }),
      ...(get(b, B.english) && { englishScore: get(b, B.english) }),
      ...(get(b, B.gap) && { gapYear: get(b, B.gap) }),
      ...(take.term && { intakeTerm: take.term }),
      ...(take.year && { intakeYear: take.year }),
      ...(toDate(get(b, B.visaDate)) && { visaIssuedDate: toDate(get(b, B.visaDate)) }),
      ...(get(b, B.majorLink) && { majorLink: get(b, B.majorLink) }),
      ...(get(b, B.checklist) && { checklistLink: get(b, B.checklist) }),
      ...(get(b, B.strategy) && { strategyNote: get(b, B.strategy) }),
      ...(get(b, B.status) && { processStatus: get(b, B.status) }),
      ...(get(b, B.subStatus) && { processSubStatus: get(b, B.subStatus) }),
      ...(get(b, B.csNote) && { csNote: get(b, B.csNote) }),
      ...(get(b, B.tuition) && { tuition: get(b, B.tuition) }),
      ...(get(b, B.invoice) && { invoiceFiles: get(b, B.invoice) }),
      ...(get(b, B.job) && { familyOccupation: get(b, B.job) }),
      ...(get(b, B.income) && { familyIncome: get(b, B.income) }),
      ...(get(b, B.assets) && { familyAssets: get(b, B.assets) }),
      ...(sale && { salesStaff: sale }),
      ...(get(b, B.processStaff) && { processStaff: get(b, B.processStaff) }),
      ...(notes.length && { notes: notes.join('\n') }),
    };
    for (const [prefix, nameCol, phoneCol, emailCol] of [
      ['father', B.fatherName, B.fatherPhone, B.fatherEmail],
      ['mother', B.motherName, B.motherPhone, B.motherEmail],
      ['sponsor', B.sponsorName, B.sponsorPhone, B.sponsorEmail],
    ] as const) {
      if (get(b, nameCol)) doc[`${prefix}Name`] = get(b, nameCol);
      if (get(b, phoneCol)) doc[`${prefix}Phone`] = get(b, phoneCol);
      if (get(b, emailCol)) doc[`${prefix}Email`] = get(b, emailCol);
    }
    if (rel && !doc[`${rel.kind}Name`]) doc[`${rel.kind}Name`] = rel.name;
    docs.push(doc);
    report.toCreate += 1;
  }

  const list = (title: string, items: string[]) => items.length && console.log(`\n${title} (${items.length}):\n  ${items.join('\n  ')}`);
  console.log(`Sẽ tạo mới: ${report.toCreate} học sinh${write ? '' : ' (chạy thử, chưa ghi gì)'}`);
  list('Bỏ qua vì đã có trong hệ thống', report.skippedExisting);
  list('Bỏ qua vì lặp trong Excel (giữ dòng đầu)', report.skippedRepeat);
  list('Bỏ qua vì Status = Huỷ', report.skippedCancelled);
  list('Bỏ qua khác', report.skippedOther);
  list('Điểm đến chưa có trong hệ thống (đã ghi vào Note)', report.unknownCountry);

  if (write && docs.length) {
    const result = await students.insertMany(docs);
    console.log(`\nĐÃ GHI: ${result.insertedCount} học sinh.`);
  }
  await client.close();
}

main();
