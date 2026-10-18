import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const NotificationLogSchema = new Schema(
  {
    studentId: { type: String, required: true },
    stageKey: { type: String },
    // 'stage' = sent by staff on a stage change; 'interview_reminder' = sent by the cron job
    kind: { type: String, enum: ['stage', 'interview_reminder'], default: 'stage' },
    // For reminders: the interview time it was sent for, so one interview gets one reminder.
    refValue: { type: String },
    to: { type: String, required: true },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    subject: { type: String, required: true },
    body: { type: String },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'opened', 'bounced', 'complained', 'failed'],
      required: true,
    },
    providerId: { type: String },
    testMode: { type: Boolean, default: false },
    error: { type: String },
  },
  { timestamps: true }
);

NotificationLogSchema.index({ studentId: 1, createdAt: -1 });
NotificationLogSchema.index({ providerId: 1 });

export type NotificationLogDoc = InferSchemaType<typeof NotificationLogSchema> & { _id: mongoose.Types.ObjectId };

export const NotificationLog =
  (mongoose.models.NotificationLog as mongoose.Model<NotificationLogDoc>) ||
  mongoose.model<NotificationLogDoc>('NotificationLog', NotificationLogSchema);

export default NotificationLog;
