import { z } from 'zod';
import { connectDB } from '@/lib/mongoose';
import { Student } from '@/models/Student';
import { NotificationLog } from '@/models/NotificationLog';
import { ok, withErrorHandling } from '@/lib/api-handler';
import { AppError, NotFoundError } from '@/lib/errors';
import { SendFailedError, sendStudentNotification } from '@/lib/notifications/send';

const sendSchema = z.object({
  stageKey: z.string().min(1),
  caseCode: z.string().trim().max(80).optional(),
  to: z.string().email(),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  body: z.string().default(''),
  notifyInfo: z.record(z.string(), z.string()).default({}),
  templateId: z.string().optional(),
  // One-off edits of a library template's text (placeholders kept); the saved template is not changed.
  templateSubject: z.string().min(1).optional(),
  templateHtml: z.string().min(1).optional(),
});

function toLogDTO(log: InstanceType<typeof NotificationLog>) {
  return {
    id: String(log._id),
    stageKey: log.stageKey,
    kind: log.kind,
    to: log.to,
    cc: log.cc,
    bcc: log.bcc ?? [],
    subject: log.subject,
    status: log.status,
    testMode: log.testMode,
    error: log.error ?? undefined,
    createdAt: log.createdAt,
  };
}

export const GET = withErrorHandling(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await connectDB();
  const logs = await NotificationLog.find({ studentId: id }).sort({ createdAt: -1 }).limit(100);
  return ok(logs.map(toLogDTO));
});

export const POST = withErrorHandling(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const input = sendSchema.parse(await req.json());
  await connectDB();

  const student = await Student.findById(id);
  if (!student) throw new NotFoundError('Student not found');

  // Staff-entered values are remembered on the student for the next stage's email.
  for (const [key, value] of Object.entries(input.notifyInfo)) {
    student.notifyInfo.set(key, value);
  }
  if (input.caseCode !== undefined) student.caseCode = input.caseCode || undefined;
  await student.save();

  try {
    const log = await sendStudentNotification(student, input);
    return ok(toLogDTO(log), 201);
  } catch (err) {
    if (err instanceof SendFailedError) throw new AppError(`Gửi mail thất bại: ${err.message}`, 502);
    throw err;
  }
});
