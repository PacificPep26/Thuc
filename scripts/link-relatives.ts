import { MongoClient } from 'mongodb';

// Links existing travelers to their student using the free text in "Quan hệ" (for example "Mẹ của Tiêu Quý Mỹ"),
// and lists students that look like a relative who was imported into the student list.
//
//   LINK_TARGET_URL=mongodb://.../thucsys npx tsx scripts/link-relatives.ts          (dry run)
//   LINK_TARGET_URL=mongodb://.../thucsys npx tsx scripts/link-relatives.ts --yes    (writes studentId + standard relation)
//
// Only an unambiguous match is written (exactly one student with that name); everything else is only reported.

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const RELATION = /^(cha|ba|bố|bo|mẹ|me|anh|chị|chi|em)\s+(?:của\s+|cua\s+)?(?:hs\s+|học sinh\s+)?(.+)$/i;

function standardRelation(word: string) {
  const w = fold(word);
  if (w === 'cha' || w === 'ba' || w === 'bo') return 'Cha';
  if (w === 'me') return 'Mẹ';
  return 'Anh/chị/em';
}

async function main() {
  const uri = process.env.LINK_TARGET_URL;
  if (!uri) throw new Error('LINK_TARGET_URL is not set.');
  const write = process.argv.includes('--yes');
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(new URL(uri).pathname.replace(/^\//, '') || 'thucsys');
    const students = await db.collection('students').find({}, { projection: { fullName: 1, serviceType: 1, contractCode: 1, importBatch: 1 } }).toArray();
    const byName = new Map<string, typeof students>();
    for (const s of students) byName.set(fold(String(s.fullName)), [...(byName.get(fold(String(s.fullName))) ?? []), s]);

    const travelers = db.collection('travelers');
    const rows = await travelers.find({}).toArray();
    let linked = 0;
    for (const t of rows) {
      const text = String(t.relationToStudent ?? '').trim();
      const m = text.match(RELATION);
      if (t.studentId) { console.log(`= đã liên kết: ${t.fullName}`); continue; }
      if (!m) { console.log(`? không đọc được quan hệ: ${t.fullName} ("${text}")`); continue; }
      const matches = byName.get(fold(m[2])) ?? [];
      if (matches.length !== 1) {
        console.log(`? ${t.fullName}: "${text}" → ${matches.length ? `${matches.length} học sinh trùng tên` : 'không thấy học sinh'}`);
        continue;
      }
      console.log(`+ ${t.fullName} → ${standardRelation(m[1])} của ${matches[0].fullName}`);
      if (write) await travelers.updateOne({ _id: t._id }, { $set: { studentId: String(matches[0]._id), relationToStudent: standardRelation(m[1]) } });
      linked += 1;
    }
    console.log(`\n${write ? 'Đã liên kết' : 'Sẽ liên kết'}: ${linked}/${rows.length} người.`);

    // Imported people on a non-study service are often the parents: only listed here, never moved automatically.
    const travelNames = new Set(rows.map((t) => fold(String(t.fullName))));
    const stray = students.filter((s) => ['du_lich', 'gia_han_visa', 'dinh_cu'].includes(String(s.serviceType)));
    console.log(`\nHọc sinh có dịch vụ Du lịch / Gia hạn visa / Định cư (${stray.length}), chưa chuyển:`);
    for (const s of stray) console.log(`  ${s.fullName} [${s.serviceType}] ${s.contractCode ?? ''}${travelNames.has(fold(String(s.fullName))) ? '  (đã có trong Du lịch)' : ''}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
