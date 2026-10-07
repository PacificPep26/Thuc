import { connectDB } from '@/lib/mongoose';
import { Traveler, type TravelerDoc } from '@/models/Traveler';
import { ok, withErrorHandling } from '@/lib/api-handler';
import { studentNamesById } from '@/lib/travelers/student-names';
import { createTravelerSchema, listTravelersQuerySchema, toCreateData, toTravelerDTO } from '@/lib/travelers/dto';

export const GET = withErrorHandling(async (req) => {
  const { searchParams } = new URL(req.url);
  const query = listTravelersQuerySchema.parse(Object.fromEntries(searchParams));
  await connectDB();

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const where: Record<string, unknown> = {};
  if (query.stage) where.stage = query.stage;
  if (query.studentId) where.studentId = query.studentId;
  if (query.destinationCountry) {
    where.destinationCountry = query.destinationCountry === 'New Zealand' ? 'NewZealand' : query.destinationCountry;
  }
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    where.$or = [{ fullName: regex }, { email: regex }];
  }

  const [items, total] = await Promise.all([
    Traveler.aggregate([
      { $match: where },
      { $addFields: { _visaExpirySort: { $ifNull: ['$visaExpiry', new Date(8640000000000000)] } } },
      { $sort: { _visaExpirySort: 1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]),
    Traveler.countDocuments(where),
  ]);

  const names = await studentNamesById(items.map((t) => t.studentId));
  return ok(items.map((t) => toTravelerDTO(t, names.get(String(t.studentId)))), 200, { total, page, limit, pages: Math.ceil(total / limit) || 1 });
});

export const POST = withErrorHandling(async (req) => {
  const body = createTravelerSchema.parse(await req.json());
  await connectDB();
  const traveler = await Traveler.create(toCreateData(body) as Partial<TravelerDoc>);
  return ok(toTravelerDTO(traveler.toObject()), 201);
});
