'use client';

import { useEffect, type MutableRefObject, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../student.api';
import { SERVICE_LABELS, type Student, type UpdateStudentInput } from '../student.types';
import { NOTIFY_FIELDS } from '@/lib/notifications/templates';

interface ProfileTabProps {
  student: Student;
  // Lets the parent modal guard against closing with unsaved edits.
  onDirtyChange?: (dirty: boolean) => void;
  saveRef?: MutableRefObject<(() => Promise<boolean>) | null>;
}

const FAMILY_KEYS = [
  'fatherName', 'fatherPhone', 'fatherEmail', 'motherName', 'motherPhone', 'motherEmail',
  'sponsorName', 'sponsorPhone', 'sponsorEmail', 'familyOccupation', 'familyIncome', 'familyAssets',
] as const;
const SERVICE_KEYS = [
  'serviceType', 'contractCode', 'contractDate', 'salesStaff', 'processStaff', 'processStatus', 'processSubStatus',
  'csNote', 'majorLink', 'checklistLink', 'strategyNote', 'tuition', 'invoiceFiles',
] as const;

type FormValues = {
  fullName: string;
  caseCode: string;
  email: string;
  emailPassword: string;
  personalEmail: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  address: string;
  highestEducation: string;
  schoolName: string;
  currentGrade: string;
  gpa: string;
  englishTest: string;
  englishScore: string;
  englishTestDate: string;
  gapYear: string;
  destinationCountry: string;
  intakeTerm: string;
  intakeYear: string;
  preferredUniversities: string;
  preferredMajor: string;
  visaIssuedDate: string;
  visaExpiry: string;
  notes: string;
  family: Record<(typeof FAMILY_KEYS)[number], string>;
  service: Record<(typeof SERVICE_KEYS)[number], string>;
  notifyInfo: Record<string, string>;
};

const day = (v?: string) => (v ? v.slice(0, 10) : '');

function toFormValues(student: Student): FormValues {
  return {
    fullName: student.personal.fullName ?? '',
    caseCode: student.caseCode ?? '',
    email: student.personal.email ?? '',
    emailPassword: student.personal.emailPassword ?? '',
    personalEmail: student.personal.personalEmail ?? '',
    phone: student.personal.phone ?? '',
    dateOfBirth: day(student.personal.dateOfBirth),
    gender: student.personal.gender ?? '',
    nationality: student.personal.nationality ?? '',
    passportNumber: student.personal.passportNumber ?? '',
    address: student.personal.address ?? '',
    highestEducation: student.academic?.highestEducation ?? '',
    schoolName: student.academic?.schoolName ?? '',
    currentGrade: student.academic?.currentGrade ?? '',
    gpa: student.academic?.gpa?.toString() ?? '',
    englishTest: student.academic?.englishTest ?? '',
    englishScore: student.academic?.englishScore ?? '',
    englishTestDate: day(student.academic?.englishTestDate),
    gapYear: student.academic?.gapYear ?? '',
    destinationCountry: student.studyAbroad?.destinationCountry ?? '',
    intakeTerm: student.studyAbroad?.intakeTerm ?? '',
    intakeYear: student.studyAbroad?.intakeYear?.toString() ?? '',
    preferredUniversities: (student.studyAbroad?.preferredUniversities ?? []).join(', '),
    preferredMajor: student.studyAbroad?.preferredMajor ?? '',
    visaIssuedDate: day(student.studyAbroad?.visaIssuedDate),
    visaExpiry: day(student.studyAbroad?.visaExpiry),
    notes: student.notes ?? '',
    family: Object.fromEntries(FAMILY_KEYS.map((k) => [k, student.family?.[k] ?? ''])) as FormValues['family'],
    service: Object.fromEntries(
      SERVICE_KEYS.map((k) => [k, k === 'contractDate' ? day(student.service?.[k]) : (student.service?.[k] ?? '')])
    ) as FormValues['service'],
    notifyInfo: Object.fromEntries(NOTIFY_FIELDS.map((f) => [f.key, student.notifyInfo?.[f.key] ?? ''])),
  };
}

const inputClass =
  'w-full rounded-md border border-border bg-background px-2.5 py-1 text-[13px] outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'mb-px block text-[11px] font-medium leading-tight text-muted-foreground';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-background/40 p-2.5">
      <h3 className="mb-1.5 text-sm font-semibold text-card-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">{children}</div>
    </section>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function ProfileTab({ student, onDirtyChange, saveRef }: ProfileTabProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ defaultValues: toFormValues(student) });

  useEffect(() => {
    reset(toFormValues(student));
  }, [student, reset]);

  const { isDirty } = formState;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateStudentInput) => studentApi.update(student.id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.setQueryData(['student', student.id], updated);
    },
  });

  async function onSubmit(values: FormValues) {
    const updated = await updateMutation.mutateAsync({
      personal: {
        fullName: values.fullName,
        email: values.email,
        emailPassword: values.emailPassword || undefined,
        personalEmail: values.personalEmail,
        phone: values.phone || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        gender: (values.gender || undefined) as Student['personal']['gender'],
        nationality: values.nationality || undefined,
        passportNumber: values.passportNumber || undefined,
        address: values.address || undefined,
      },
      academic: {
        highestEducation: values.highestEducation || undefined,
        schoolName: values.schoolName || undefined,
        currentGrade: values.currentGrade,
        gapYear: values.gapYear,
        gpa: values.gpa ? Number(values.gpa) : undefined,
        englishTest: (values.englishTest || undefined) as Student['academic']['englishTest'],
        englishScore: values.englishScore || undefined,
        englishTestDate: values.englishTestDate || undefined,
      },
      studyAbroad: {
        destinationCountry: (values.destinationCountry || undefined) as Student['studyAbroad']['destinationCountry'],
        intakeTerm: values.intakeTerm || undefined,
        intakeYear: values.intakeYear ? Number(values.intakeYear) : undefined,
        preferredUniversities: values.preferredUniversities
          ? values.preferredUniversities.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        preferredMajor: values.preferredMajor || undefined,
        visaIssuedDate: values.visaIssuedDate || undefined,
        visaExpiry: values.visaExpiry || undefined,
      },
      family: values.family,
      service: values.service as UpdateStudentInput['service'],
      notes: values.notes,
      caseCode: values.caseCode || undefined,
      notifyInfo: values.notifyInfo,
    });
    // Mark the just-saved values as the new baseline before a guarded tab switch/close.
    reset(toFormValues(updated));
    onDirtyChange?.(false);
  }

  useEffect(() => {
    if (!saveRef) return;
    saveRef.current = () =>
      new Promise<boolean>((resolve) => {
        void handleSubmit(
          async (values) => {
            try {
              await onSubmit(values);
              resolve(true);
            } catch {
              resolve(false);
            }
          },
          () => resolve(false)
        )();
      });
    return () => {
      saveRef.current = null;
    };
  });

  const text = (name: Parameters<typeof register>[0], props: Record<string, unknown> = {}) => (
    <input {...register(name)} autoComplete="off" className={inputClass} {...props} />
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Column 1: the person and how to reach them */}
        <div className="flex flex-col gap-3">
          <Card title="Thông tin cá nhân">
            <Field label="Họ tên" wide>{text('fullName')}</Field>
            <Field label="Ngày sinh">{text('dateOfBirth', { type: 'date' })}</Field>
            <Field label="Giới tính">
              <select {...register('gender')} className={inputClass}>
                <option value="">—</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </Field>
            <Field label="Quốc tịch">{text('nationality')}</Field>
            <Field label="Số hộ chiếu">{text('passportNumber')}</Field>
            <Field label="Địa chỉ" wide>{text('address')}</Field>
          </Card>
          <Card title="Liên hệ & tài khoản">
            <Field label="Số điện thoại">{text('phone')}</Field>
            <Field label="Mã hồ sơ">{text('caseCode', { placeholder: 'MTA-2026-0001' })}</Field>
            <Field label="Email cá nhân (nhận mail cập nhật)" wide>{text('personalEmail', { type: 'email' })}</Field>
            <Field label="Email công ty tạo">{text('email', { type: 'email' })}</Field>
            <Field label="Mật khẩu email công ty">{text('emailPassword', { autoComplete: 'new-password' })}</Field>
          </Card>
          <Card title="Học vấn">
            <Field label="Trường hiện tại" wide>{text('schoolName')}</Field>
            <Field label="Bậc học / Lớp">{text('currentGrade')}</Field>
            <Field label="Trình độ cao nhất">{text('highestEducation')}</Field>
            <Field label="GPA">{text('gpa', { type: 'number', step: '0.01' })}</Field>
            <Field label="Gap year">{text('gapYear')}</Field>
            <Field label="Chứng chỉ tiếng Anh">
              <select {...register('englishTest')} className={inputClass}>
                <option value="">—</option>
                <option value="IELTS">IELTS</option>
                <option value="TOEFL">TOEFL</option>
                <option value="PTE">PTE</option>
                <option value="Duolingo">Duolingo</option>
                <option value="None">Không có</option>
              </select>
            </Field>
            <Field label="Điểm / trình độ">{text('englishScore')}</Field>
            <Field label="Ngày thi">{text('englishTestDate', { type: 'date' })}</Field>
          </Card>
        </div>

        {/* Column 2: family */}
        <div className="flex flex-col gap-3">
          <Card title="Gia đình">
            <Field label="Họ tên cha">{text('family.fatherName')}</Field>
            <Field label="SĐT cha">{text('family.fatherPhone')}</Field>
            <Field label="Email cha" wide>{text('family.fatherEmail', { type: 'email' })}</Field>
            <Field label="Họ tên mẹ">{text('family.motherName')}</Field>
            <Field label="SĐT mẹ">{text('family.motherPhone')}</Field>
            <Field label="Email mẹ" wide>{text('family.motherEmail', { type: 'email' })}</Field>
            <Field label="Người bảo trợ">{text('family.sponsorName')}</Field>
            <Field label="SĐT người bảo trợ">{text('family.sponsorPhone')}</Field>
            <Field label="Email người bảo trợ" wide>{text('family.sponsorEmail', { type: 'email' })}</Field>
            <Field label="Nghề nghiệp" wide>{text('family.familyOccupation')}</Field>
            <Field label="Thu nhập">{text('family.familyIncome')}</Field>
            <Field label="Tài sản">{text('family.familyAssets')}</Field>
          </Card>
          <Card title="Ghi chú">
            <Field label="Định hướng xử lý" wide>
              <textarea {...register('service.strategyNote')} rows={2} className={inputClass} />
            </Field>
            <Field label="Note" wide>
              <textarea {...register('notes')} rows={2} className={inputClass} />
            </Field>
            <Field label="Note của CSKH" wide>
              <textarea {...register('service.csNote')} rows={2} className={inputClass} />
            </Field>
          </Card>
        </div>

        {/* Column 3: service, contract and the study-abroad file */}
        <div className="flex flex-col gap-3">
          <Card title="Dịch vụ & hợp đồng">
            <Field label="Loại dịch vụ">
              <select {...register('service.serviceType')} className={inputClass}>
                <option value="">—</option>
                {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Mã hợp đồng">{text('service.contractCode')}</Field>
            <Field label="Ngày ký HĐ">{text('service.contractDate', { type: 'date' })}</Field>
            <Field label="Sale">{text('service.salesStaff')}</Field>
            <Field label="Nhân viên XLHS">{text('service.processStaff')}</Field>
            <Field label="Status">{text('service.processStatus')}</Field>
            <Field label="Sub-Status" wide>{text('service.processSubStatus')}</Field>
          </Card>
          <Card title="Hồ sơ du học">
            <Field label="Điểm đến">
              <select {...register('destinationCountry')} className={inputClass}>
                <option value="">—</option>
                <option value="USA">Mỹ</option>
                <option value="Canada">Canada</option>
                <option value="New Zealand">New Zealand</option>
                <option value="Germany">Đức</option>
                <option value="France">Pháp</option>
              </select>
            </Field>
            <Field label="Kỳ nhập học">{text('intakeTerm', { placeholder: 'VD: Mùa thu' })}</Field>
            <Field label="Năm nhập học">{text('intakeYear', { type: 'number' })}</Field>
            <Field label="Học phí">{text('service.tuition')}</Field>
            <Field label="Trường" wide>{text('preferredUniversities', { placeholder: 'Cách nhau bởi dấu phẩy' })}</Field>
            <Field label="Ngành học">{text('preferredMajor')}</Field>
            <Field label="Link ngành">{text('service.majorLink')}</Field>
            <Field label="Ngày cấp visa">{text('visaIssuedDate', { type: 'date' })}</Field>
            <Field label="Thời hạn visa">{text('visaExpiry', { type: 'date' })}</Field>
            <Field label="Link checklist" wide>{text('service.checklistLink')}</Field>
            <Field label="Invoice & Receipt" wide>{text('service.invoiceFiles')}</Field>
          </Card>
        </div>
      </div>


      <section className="rounded-lg border border-border bg-background/40 p-3">
        <h3 className="text-sm font-semibold text-card-foreground">Thông tin gửi mail</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Dùng để điền vào mail cập nhật hồ sơ. Popup gửi mail đọc và ghi cùng các ô này.
        </p>
        <div className="grid grid-cols-1 gap-x-2 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {NOTIFY_FIELDS.map((f) => (
            <div key={f.key}>
              <label className={labelClass}>{f.label}</label>
              <input {...register(`notifyInfo.${f.key}`)} type={f.type} className={inputClass} />
            </div>
          ))}
        </div>
      </section>

      {updateMutation.isError && <p className="text-sm text-red-500">Không thể lưu thay đổi.</p>}

      <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 flex justify-end border-t border-border bg-card px-4 py-2 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
        <button
          type="submit"
          disabled={formState.isSubmitting || updateMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-90 hover:shadow-md active:brightness-75 disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}
