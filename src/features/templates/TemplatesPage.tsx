'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { workflowApi } from '@/features/workflow/workflow.api';
import { checklistApi } from '@/features/checklists/checklist.api';
import { formApi } from '@/features/forms/form.api';
import { CreateWorkflowModal } from './CreateWorkflowModal';
import { CreateChecklistModal } from './CreateChecklistModal';
import { CreateFormTemplateModal } from './CreateFormTemplateModal';
import { StagesSection } from '@/features/stages/StagesSection';

const countryLabels: Record<string, string> = { USA: 'Mỹ', Canada: 'Canada', 'New Zealand': 'New Zealand', Germany: 'Đức', France: 'Pháp' };

const TABS = [
  { key: 'student_stage', label: 'Giai đoạn HS' },
  { key: 'travel_stage', label: 'Giai đoạn Du lịch' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'form', label: 'Biểu mẫu' },
] as const;

type TemplateTabKey = (typeof TABS)[number]['key'];

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>
      <button onClick={onAdd} className="flex items-center gap-1 text-sm text-primary hover:underline">
        <Plus size={14} /> Thêm mới
      </button>
    </div>
  );
}

export function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateTabKey>('student_stage');
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: workflows } = useQuery({ queryKey: ['workflow-templates'], queryFn: workflowApi.listTemplates });
  const { data: checklists } = useQuery({ queryKey: ['checklist-templates'], queryFn: () => checklistApi.listTemplates() });
  const { data: forms } = useQuery({ queryKey: ['form-templates'], queryFn: formApi.listTemplates });

  return (
    <div>
      <h1 className="mb-4 text-xl sm:text-2xl font-semibold text-foreground">Mẫu quy trình</h1>

      {/* Mobile Tab Switcher */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar lg:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <div className={activeTab !== 'student_stage' ? 'hidden lg:block' : ''}>
          <StagesSection type="student" title="Giai đoạn học sinh" />
        </div>

        <div className={activeTab !== 'travel_stage' ? 'hidden lg:block' : ''}>
          <StagesSection type="travel" title="Giai đoạn du lịch / visa" />
        </div>

        <div className={`rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs ${activeTab !== 'workflow' ? 'hidden lg:block' : ''}`}>
          <SectionHeader title="Mẫu quy trình (Workflow)" onAdd={() => setIsWorkflowOpen(true)} />
          <div className="flex flex-col divide-y divide-border">
            {(workflows ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-xs sm:text-sm">
                <span className="font-medium text-card-foreground">{t.name}</span>
                <span className="text-muted-foreground">{t.steps.length} bước</span>
              </div>
            ))}
            {workflows?.length === 0 && <p className="py-2 text-xs sm:text-sm text-muted-foreground">Chưa có mẫu nào.</p>}
          </div>
        </div>

        <div className={`rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs ${activeTab !== 'checklist' ? 'hidden lg:block' : ''}`}>
          <SectionHeader title="Mẫu checklist" onAdd={() => setIsChecklistOpen(true)} />
          <div className="flex flex-col divide-y divide-border">
            {(checklists ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-xs sm:text-sm">
                <span className="font-medium text-card-foreground">
                  {t.name} <span className="text-muted-foreground">({countryLabels[t.country] ?? t.country})</span>
                </span>
                <span className="text-muted-foreground">{t.items.length} mục</span>
              </div>
            ))}
            {checklists?.length === 0 && <p className="py-2 text-xs sm:text-sm text-muted-foreground">Chưa có mẫu nào.</p>}
          </div>
        </div>

        <div className={`rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs ${activeTab !== 'form' ? 'hidden lg:block' : ''}`}>
          <SectionHeader title="Mẫu biểu mẫu (Form)" onAdd={() => setIsFormOpen(true)} />
          <div className="flex flex-col divide-y divide-border">
            {(forms ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-xs sm:text-sm">
                <span className="font-medium text-card-foreground">{t.name}</span>
                <span className="text-muted-foreground">{t.fields.length} trường</span>
              </div>
            ))}
            {forms?.length === 0 && <p className="py-2 text-xs sm:text-sm text-muted-foreground">Chưa có mẫu nào.</p>}
          </div>
        </div>
      </div>

      <CreateWorkflowModal open={isWorkflowOpen} onOpenChange={setIsWorkflowOpen} />
      <CreateChecklistModal open={isChecklistOpen} onOpenChange={setIsChecklistOpen} />
      <CreateFormTemplateModal open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
