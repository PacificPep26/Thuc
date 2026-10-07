import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import { Student, type StudentDoc } from '@/models/Student';
import { StageTemplate } from '@/models/StageTemplate';
import { Todo, type TodoDoc } from '@/models/Todo';
import { ok, withErrorHandling } from '@/lib/api-handler';
import { createStudentSchema, listStudentsQuerySchema, toCreateData, toStudentDTO } from '@/lib/students/dto';

const VISA_WARNING_DAYS = 30;
const DAY_MS = 24 * 3600_000;
const toDbCountry = (c: string) => (c === 'New Zealand' ? 'NewZealand' : c);
const toUiCountry = (c: string) => (c === 'NewZealand' ? 'New Zealand' : c);

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function vietnamDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// Filtering, paging and the counts shown on the filter chips all run in MongoDB so the list
// stays fast and complete however many students there are.
export const GET = withErrorHandling(async (req) => {
  const { searchParams } = new URL(req.url);
  const query = listStudentsQuerySchema.parse(Object.fromEntries(searchParams));
  await connectDB();

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const base: Record<string, unknown> = {};
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    base.$or = [{ fullName: regex }, { email: regex }, { personalEmail: regex }];
  }
  const quickMatch = async (quick?: string): Promise<Record<string, unknown>> => {
    if (quick === 'visa') return { visaExpiry: { $ne: null, $lte: new Date(Date.now() + VISA_WARNING_DAYS * DAY_MS) } };
    if (quick === 'pinned') return { pinned: true };
    if (quick === 'due') return { 'notifyInfo.ngayCapNhatTiepTheo': { $gt: '', $lte: ymd(new Date(Date.now() + DAY_MS)) } };
    if (quick === 'todo') {
      const ids = (await Todo.distinct('studentId', { done: false })) as string[];
      return { _id: { $in: ids.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id)) } };
    }
    return {};
  };
  const pinned: Record<string, unknown> = query.pinned ? { pinned: true } : {};
  const country: Record<string, unknown> = query.destinationCountry ? { destinationCountry: toDbCountry(query.destinationCountry) } : {};
  const stage: Record<string, unknown> = query.stage ? { stage: query.stage } : {};
  const service: Record<string, unknown> = query.serviceType ? { serviceType: query.serviceType } : {};

  const today = vietnamDateKey(new Date());
  const tomorrow = vietnamDateKey(new Date(Date.now() + DAY_MS));
  // Independent lookups run together: each is a round trip to the remote database.
  const [quick, stageRowsRaw, dueTodoStudentIds, tomorrowTodoStudentIds] = await Promise.all([
    quickMatch(query.quick),
    StageTemplate.find({ type: 'student' }, { key: 1 }).sort({ order: 1 }),
    Todo.distinct('studentId', { done: false, dueDate: { $gt: '', $lte: today } }) as Promise<string[]>,
    Todo.distinct('studentId', { done: false, dueDate: tomorrow }) as Promise<string[]>,
  ]);
  const stageKeys = stageRowsRaw.map((s) => s.key);
  const where = { ...base, ...quick, ...pinned, ...country, ...stage, ...service };

  const sortSpec: Record<string, 1 | -1> =
    query.sort === 'updated'
      ? { updatedAt: -1, fullName: 1 }
      : query.sort === 'name-asc'
        ? { fullName: 1 }
        : query.sort === 'name-desc'
          ? { fullName: -1 }
          : query.sort === 'visa'
            ? { _hasVisa: 1, visaExpiry: 1, fullName: 1 }
            : { _todoPriority: 1, _pinned: 1, _stageIdx: 1, fullName: 1 };

  const [items, total, countryRows, stageRows, dueCount] = await Promise.all([
    Student.aggregate([
      { $match: where },
      // Derived fields keep missing visa dates last and preserve the pipeline order sort.
      { $addFields: { _stageIdx: { $indexOfArray: [stageKeys, '$stage'] }, _hasVisa: { $cond: [{ $ne: ['$visaExpiry', null] }, 0, 1] } } },
      {
        $addFields: {
          _stageIdx: { $cond: [{ $lt: ['$_stageIdx', 0] }, stageKeys.length, '$_stageIdx'] },
          _pinned: { $cond: ['$pinned', 0, 1] },
          _todoPriority: {
            $switch: {
              branches: [
                { case: { $in: [{ $toString: '$_id' }, dueTodoStudentIds] }, then: 0 },
                { case: { $in: [{ $toString: '$_id' }, tomorrowTodoStudentIds] }, then: 1 },
              ],
              default: 2,
            },
          },
        },
      },
      { $sort: sortSpec },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      // Join todos for just this page of students instead of the whole todos collection.
      {
        $lookup: {
          from: 'todos',
          let: { studentId: { $toString: '$_id' } },
          pipeline: [{ $match: { $expr: { $eq: ['$studentId', '$$studentId'] } } }],
          as: 'todos',
        },
      },
    ]),
    Student.countDocuments(where),
    // Country chips ignore the country/stage selection; stage chips respect the country.
    Student.aggregate([{ $match: { ...base, ...quick, ...pinned } }, { $group: { _id: '$destinationCountry', n: { $sum: 1 } } }]),
    Student.aggregate([{ $match: { ...base, ...quick, ...pinned, ...country } }, { $group: { _id: '$stage', n: { $sum: 1 } } }]),
    Student.countDocuments({ ...base, ...pinned, ...country, ...stage, ...(await quickMatch('due')) }),
  ]);

  const countries: Record<string, number> = {};
  for (const r of countryRows) if (r._id) countries[toUiCountry(r._id)] = r.n;
  const stages: Record<string, number> = {};
  for (const r of stageRows) if (r._id) stages[r._id] = r.n;
  const all = countryRows.reduce((sum, r) => sum + r.n, 0);

  return ok(
    items.map((s) => toStudentDTO(s, (s.todos ?? []) as TodoDoc[])),
    200,
    { total, page, limit, pages: Math.ceil(total / limit) || 1, facets: { all, countries, stages, due: dueCount } }
  );
});

export const POST = withErrorHandling(async (req) => {
  const body = createStudentSchema.parse(await req.json());
  await connectDB();
  const student = await Student.create(toCreateData(body) as Partial<StudentDoc>);
  return ok(toStudentDTO(student.toObject(), []), 201);
});
