'use client';

import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, X } from 'lucide-react';
import { studentApi } from '../student.api';
import { ProfileTab } from './ProfileTab';
import { NotesTab } from './NotesTab';
import { WorkflowTab } from './WorkflowTab';
import { ChecklistTab } from './ChecklistTab';
import { DocumentsTab } from './DocumentsTab';
import { FormsTab } from './FormsTab';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { EmailsTab } from './EmailsTab';
import { RelativesTab } from './RelativesTab';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'workflow', label: 'Kế hoạch / Quy trình' },
  { key: 'notes', label: 'Việc cần làm' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'profile', label: 'Hồ sơ' },
  { key: 'relatives', label: 'Người thân' },
  { key: 'documents', label: 'Tài liệu' },
  { key: 'forms', label: 'Biểu mẫu' },
  { key: 'emails', label: 'Email' },
] as const;

export type StudentDetailTabKey = (typeof TABS)[number]['key'];

interface StudentDetailModalProps {
  studentId: string | null;
  initialTab?: StudentDetailTabKey;
  onOpenChange: (open: boolean) => void;
}

export function StudentDetailModal(props: StudentDetailModalProps) {
  // A fresh detail form for each selected student also resets the requested initial tab
  // without synchronously mirroring props into state from an effect.
  return <StudentDetailModalContent key={`${props.studentId ?? 'closed'}:${props.initialTab ?? 'profile'}`} {...props} />;
}

function StudentDetailModalContent({ studentId, initialTab, onOpenChange }: StudentDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<StudentDetailTabKey>(initialTab ?? 'profile');
  // Unsaved-edits guard for the profile form: leaving (close or tab switch) asks first.
  const [dirty, setDirty] = useState(false);
  const saveRef = useRef<(() => Promise<boolean>) | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const [hasPendingAction, setHasPendingAction] = useState(false);
  const [saving, setSaving] = useState(false);

  function guard(action: () => void) {
    if (dirty) {
      pendingActionRef.current = action;
      setHasPendingAction(true);
    }
    else action();
  }

  async function saveAndContinue() {
    const action = pendingActionRef.current;
    setSaving(true);
    const okSaved = (await saveRef.current?.()) ?? false;
    setSaving(false);
    if (okSaved) {
      setDirty(false);
      pendingActionRef.current = null;
      setHasPendingAction(false);
      action?.();
    }
  }

  function cancelPending() {
    pendingActionRef.current = null;
    setHasPendingAction(false);
  }

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentApi.getById(studentId as string),
    enabled: Boolean(studentId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => studentApi.remove(studentId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      onOpenChange(false);
    },
  });

  function handleDelete() {
    if (confirm(`Xóa học sinh "${student?.personal.fullName ?? ''}"? Hành động này không thể hoàn tác.`)) {
      deleteMutation.mutate();
    }
  }

  return (
    <Dialog.Root open={Boolean(studentId)} onOpenChange={(next) => !next && guard(() => onOpenChange(false))}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          // While the unsaved-changes prompt is open, clicks on it must not count as "outside".
          onInteractOutside={(e) => hasPendingAction && e.preventDefault()}
          onEscapeKeyDown={(e) => hasPendingAction && e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:max-h-[90vh] sm:max-w-3xl xl:max-w-[1180px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            <Dialog.Title className="truncate text-base font-semibold text-card-foreground sm:text-lg">
              {student?.personal.fullName ?? 'Học sinh'}
            </Dialog.Title>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={!student || deleteMutation.isPending}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-500 disabled:opacity-50"
                title="Xóa học sinh"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Xóa</span>
              </button>
              <Dialog.Close className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </Dialog.Close>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => tab.key !== activeTab && guard(() => setActiveTab(tab.key))}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition',
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isLoading && <p className="text-sm text-muted-foreground">Đang tải thông tin học sinh…</p>}
              {student && (
                <>
                  {activeTab === 'profile' && <ProfileTab student={student} onDirtyChange={setDirty} saveRef={saveRef} />}
                  {activeTab === 'notes' && <NotesTab student={student} />}
                  {activeTab === 'workflow' && (
                    <WorkflowTab studentId={student.id} destinationCountry={student.studyAbroad?.destinationCountry} />
                  )}
                  {activeTab === 'checklist' && (
                    <ChecklistTab studentId={student.id} destinationCountry={student.studyAbroad?.destinationCountry} />
                  )}
                  {activeTab === 'documents' && <DocumentsTab studentId={student.id} />}
                  {activeTab === 'emails' && <EmailsTab student={student} />}
                  {activeTab === 'forms' && <FormsTab studentId={student.id} />}
                  {activeTab === 'relatives' && <RelativesTab student={student} />}
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      <UnsavedChangesDialog
        open={hasPendingAction}
        saving={saving}
        onSave={saveAndContinue}
        onDiscard={() => {
          const action = pendingActionRef.current;
          setDirty(false);
          cancelPending();
          action?.();
        }}
        onCancel={cancelPending}
      />
    </Dialog.Root>
  );
}
