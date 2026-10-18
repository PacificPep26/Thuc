import { api } from '@/lib/api';

export interface NotificationLog {
  id: string;
  stageKey?: string;
  kind: 'stage' | 'interview_reminder';
  to: string;
  cc: string[];
  subject: string;
  status: 'sent' | 'delivered' | 'opened' | 'bounced' | 'complained' | 'failed';
  testMode: boolean;
  error?: string;
  createdAt: string;
}

export interface SendNotificationInput {
  stageKey: string;
  caseCode?: string;
  to: string;
  cc: string[];
  bcc?: string[];
  subject: string;
  body: string;
  notifyInfo: Record<string, string>;
  templateId?: string;
  templateSubject?: string;
  templateHtml?: string;
}

export const notificationApi = {
  async list(studentId: string): Promise<NotificationLog[]> {
    const res = await api.get<{ success: boolean; data: NotificationLog[] }>(`/students/${studentId}/notifications`);
    return res.data.data;
  },
  async ensureCaseCode(studentId: string): Promise<string> {
    const res = await api.post<{ success: boolean; data: { caseCode: string } }>(`/students/${studentId}/case-code`);
    return res.data.data.caseCode;
  },
  async send(studentId: string, input: SendNotificationInput): Promise<NotificationLog> {
    const res = await api.post<{ success: boolean; data: NotificationLog }>(`/students/${studentId}/notifications`, input);
    return res.data.data;
  },
};
