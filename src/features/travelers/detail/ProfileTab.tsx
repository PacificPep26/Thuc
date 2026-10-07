'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { travelerApi } from '../traveler.api';
import type { Traveler, UpdateTravelerInput } from '../traveler.types';
import { StudentPicker } from '../StudentPicker';

export const RELATION_OPTIONS = ['Cha', 'Mẹ', 'Anh/chị/em', 'Người giám hộ', 'Khác'] as const;

interface ProfileTabProps {
  traveler: Traveler;
}

type FormValues = {
  fullName: string;
  studentId: string;
  relationToStudent: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  address: string;
  destinationCountry: string;
  visaType: string;
  purposeOfTrip: string;
  plannedDepartureDate: string;
  plannedReturnDate: string;
  applicationDate: string;
  interviewDate: string;
  visaIssuedDate: string;
  visaExpiry: string;
  sponsorName: string;
  sponsorRelationship: string;
  proofOfIncome: string;
  bankStatementProvided: boolean;
};

function toFormValues(traveler: Traveler): FormValues {
  return {
    fullName: traveler.personal.fullName ?? '',
    studentId: traveler.studentId ?? '',
    relationToStudent: traveler.personal.relationToStudent ?? '',
    email: traveler.personal.email ?? '',
    phone: traveler.personal.phone ?? '',
    dateOfBirth: traveler.personal.dateOfBirth ? traveler.personal.dateOfBirth.slice(0, 10) : '',
    nationality: traveler.personal.nationality ?? '',
    passportNumber: traveler.personal.passportNumber ?? '',
    passportExpiry: traveler.personal.passportExpiry ? traveler.personal.passportExpiry.slice(0, 10) : '',
    address: traveler.personal.address ?? '',
    destinationCountry: traveler.travel?.destinationCountry ?? '',
    visaType: traveler.travel?.visaType ?? '',
    purposeOfTrip: traveler.travel?.purposeOfTrip ?? '',
    plannedDepartureDate: traveler.travel?.plannedDepartureDate ? traveler.travel.plannedDepartureDate.slice(0, 10) : '',
    plannedReturnDate: traveler.travel?.plannedReturnDate ? traveler.travel.plannedReturnDate.slice(0, 10) : '',
    applicationDate: traveler.travel?.applicationDate ? traveler.travel.applicationDate.slice(0, 10) : '',
    interviewDate: traveler.travel?.interviewDate ? traveler.travel.interviewDate.slice(0, 10) : '',
    visaIssuedDate: traveler.travel?.visaIssuedDate ? traveler.travel.visaIssuedDate.slice(0, 10) : '',
    visaExpiry: traveler.travel?.visaExpiry ? traveler.travel.visaExpiry.slice(0, 10) : '',
    sponsorName: traveler.financial?.sponsorName ?? '',
    sponsorRelationship: traveler.financial?.sponsorRelationship ?? '',
    proofOfIncome: traveler.financial?.proofOfIncome ?? '',
    bankStatementProvided: traveler.financial?.bankStatementProvided ?? false,
  };
}

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'mb-1 block text-sm font-medium text-card-foreground';

export function ProfileTab({ traveler }: ProfileTabProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState, watch, setValue } = useForm<FormValues>({ defaultValues: toFormValues(traveler) });
  const studentId = watch('studentId');
  const [studentName, setStudentName] = useState(traveler.studentName);

  useEffect(() => {
    reset(toFormValues(traveler));
  }, [traveler, reset]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateTravelerInput) => travelerApi.update(traveler.id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['travelers'] });
      queryClient.setQueryData(['traveler', traveler.id], updated);
    },
  });

  function onSubmit(values: FormValues) {
    updateMutation.mutate({
      studentId: values.studentId || null,
      personal: {
        fullName: values.fullName,
        relationToStudent: values.relationToStudent || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        nationality: values.nationality || undefined,
        passportNumber: values.passportNumber || undefined,
        passportExpiry: values.passportExpiry || undefined,
        address: values.address || undefined,
      },
      travel: {
        destinationCountry: (values.destinationCountry || undefined) as Traveler['travel']['destinationCountry'],
        visaType: values.visaType || undefined,
        purposeOfTrip: values.purposeOfTrip || undefined,
        plannedDepartureDate: values.plannedDepartureDate || undefined,
        plannedReturnDate: values.plannedReturnDate || undefined,
        applicationDate: values.applicationDate || undefined,
        interviewDate: values.interviewDate || undefined,
        visaIssuedDate: values.visaIssuedDate || undefined,
        visaExpiry: values.visaExpiry || undefined,
      },
      financial: {
        sponsorName: values.sponsorName || undefined,
        sponsorRelationship: values.sponsorRelationship || undefined,
        proofOfIncome: values.proofOfIncome || undefined,
        bankStatementProvided: values.bankStatementProvided,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">Thông tin cá nhân</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Họ tên</label>
            <input {...register('fullName')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quan hệ với học sinh</label>
            <select {...register('relationToStudent')} className={inputClass}>
              <option value="">—</option>
              {/* Keep an older free-text value selectable until staff pick a standard one. */}
              {traveler.personal.relationToStudent && !(RELATION_OPTIONS as readonly string[]).includes(traveler.personal.relationToStudent) && (
                <option value={traveler.personal.relationToStudent}>{traveler.personal.relationToStudent}</option>
              )}
              {RELATION_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Học sinh liên quan</label>
            <StudentPicker
              studentId={studentId || null}
              studentName={studentName}
              onChange={(student) => {
                setValue('studentId', student?.id ?? '', { shouldDirty: true });
                setStudentName(student?.name);
              }}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input {...register('email')} type="email" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Số điện thoại</label>
            <input {...register('phone')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ngày sinh</label>
            <input {...register('dateOfBirth')} type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quốc tịch</label>
            <input {...register('nationality')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Số hộ chiếu</label>
            <input {...register('passportNumber')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ngày hết hạn hộ chiếu</label>
            <input {...register('passportExpiry')} type="date" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Địa chỉ</label>
            <input {...register('address')} className={inputClass} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">Thông tin visa / chuyến đi</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Điểm đến</label>
            <select {...register('destinationCountry')} className={inputClass}>
              <option value="">—</option>
              <option value="USA">Mỹ</option>
              <option value="Canada">Canada</option>
              <option value="New Zealand">New Zealand</option>
              <option value="Germany">Đức</option>
              <option value="France">Pháp</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Loại visa</label>
            <input {...register('visaType')} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Mục đích chuyến đi</label>
            <input {...register('purposeOfTrip')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ngày dự kiến khởi hành</label>
            <input {...register('plannedDepartureDate')} type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ngày dự kiến về</label>
            <input {...register('plannedReturnDate')} type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ngày nộp đơn</label>
            <input {...register('applicationDate')} type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ngày phỏng vấn</label>
            <input {...register('interviewDate')} type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ngày cấp visa</label>
            <input {...register('visaIssuedDate')} type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Thời hạn visa</label>
            <input {...register('visaExpiry')} type="date" className={inputClass} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">Tài chính / Bảo lãnh</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Người bảo lãnh</label>
            <input {...register('sponsorName')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quan hệ với người bảo lãnh</label>
            <input {...register('sponsorRelationship')} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Chứng minh thu nhập</label>
            <input {...register('proofOfIncome')} className={inputClass} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input id="bankStatementProvided" type="checkbox" {...register('bankStatementProvided')} className="h-4 w-4" />
            <label htmlFor="bankStatementProvided" className="text-sm text-card-foreground">
              Đã cung cấp sao kê ngân hàng
            </label>
          </div>
        </div>
      </section>

      {updateMutation.isError && <p className="text-sm text-red-500">Không thể lưu thay đổi.</p>}

      <div className="flex justify-end">
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
