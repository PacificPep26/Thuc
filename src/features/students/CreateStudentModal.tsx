'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { studentApi } from './student.api';
import { SERVICE_LABELS } from './student.types';

const formSchema = z.object({
  fullName: z.string().min(2, 'Vui lòng nhập họ tên'),
  personalEmail: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  destinationCountry: z.enum(['USA', 'Canada', 'New Zealand', 'Germany', 'France']).optional(),
  preferredMajor: z.string().optional(),
  serviceType: z.enum(['du_hoc', 'du_hoc_he', 'onshore', 'gia_han_visa', 'du_lich', 'dinh_cu']).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStudentModal({ open, onOpenChange }: CreateStudentModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      studentApi.create({
        personal: { fullName: values.fullName, personalEmail: values.personalEmail, phone: values.phone || undefined },
        studyAbroad: {
          destinationCountry: values.destinationCountry || undefined,
          preferredMajor: values.preferredMajor || undefined,
        },
        service: values.serviceType ? { serviceType: values.serviceType } : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      reset();
      onOpenChange(false);
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-lg sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-card-foreground">Thêm học sinh</Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground">Họ tên</label>
              <input
                {...register('fullName')}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nguyễn Văn A"
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground">Email cá nhân</label>
              <input
                {...register('personalEmail')}
                type="email"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="hocsinh@example.com"
              />
              {errors.personalEmail && <p className="mt-1 text-xs text-red-500">{errors.personalEmail.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground">Số điện thoại</label>
              <input
                {...register('phone')}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="+84 900 000 000"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground">Loại dịch vụ</label>
              <select
                {...register('serviceType')}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Chọn…</option>
                {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground">Điểm đến du học</label>
              <select
                {...register('destinationCountry')}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Chọn…</option>
                <option value="USA">Mỹ</option>
                <option value="Canada">Canada</option>
                <option value="New Zealand">New Zealand</option>
                <option value="Germany">Đức</option>
                <option value="France">Pháp</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground">Ngành học mong muốn</label>
              <input
                {...register('preferredMajor')}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Khoa học máy tính"
              />
            </div>

            {createMutation.isError && (
              <p className="text-sm text-red-500">Không thể tạo học sinh. Vui lòng thử lại.</p>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <Dialog.Close className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                Hủy
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-90 hover:shadow-md active:brightness-75 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Đang lưu…' : 'Lưu học sinh'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
