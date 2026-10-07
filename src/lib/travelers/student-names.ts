import mongoose from 'mongoose';
import { Student } from '@/models/Student';

// Name of each linked student, fetched in one query so lists can show "Mẹ của X" as a real link.
export async function studentNamesById(studentIds: Array<string | null | undefined>) {
  const ids = [...new Set(studentIds.filter((id): id is string => Boolean(id) && mongoose.isValidObjectId(id)))];
  if (!ids.length) return new Map<string, string>();
  const rows = await Student.find({ _id: { $in: ids } }, { fullName: 1 }).lean();
  return new Map(rows.map((s) => [String(s._id), s.fullName as string]));
}
