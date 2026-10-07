import { connectDB } from '@/lib/mongoose';
import { Traveler } from '@/models/Traveler';
import { TravelerDocument } from '@/models/TravelerDocument';
import { noContent, ok, withErrorHandling } from '@/lib/api-handler';
import { NotFoundError } from '@/lib/errors';
import { studentNamesById } from '@/lib/travelers/student-names';
import { toTravelerDTO, toUpdateData, updateTravelerSchema } from '@/lib/travelers/dto';

export const GET = withErrorHandling(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await connectDB();
  const traveler = await Traveler.findById(id);
  if (!traveler) throw new NotFoundError('Traveler not found');
  const names = await studentNamesById([traveler.studentId]);
  return ok(toTravelerDTO(traveler.toObject(), names.get(String(traveler.studentId))));
});

export const PUT = withErrorHandling(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = updateTravelerSchema.parse(await req.json());
  await connectDB();
  const exists = await Traveler.exists({ _id: id });
  if (!exists) throw new NotFoundError('Traveler not found');
  const traveler = await Traveler.findByIdAndUpdate(id, toUpdateData(body), { new: true });
  if (!traveler) throw new NotFoundError('Traveler not found');
  const names = await studentNamesById([traveler.studentId]);
  return ok(toTravelerDTO(traveler.toObject(), names.get(String(traveler.studentId))));
});

export const DELETE = withErrorHandling(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await connectDB();
  const exists = await Traveler.exists({ _id: id });
  if (!exists) throw new NotFoundError('Traveler not found');
  await Traveler.findByIdAndDelete(id);
  await TravelerDocument.deleteMany({ travelerId: id });
  return noContent();
});
