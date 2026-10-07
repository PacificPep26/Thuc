import { z } from 'zod';
import type { StudentDoc } from '@/models/Student';
import type { TodoDoc } from '@/models/Todo';
import { NOTIFY_FIELDS } from '@/lib/notifications/templates';

const personalSchema = z.object({
  fullName: z.string().min(2),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.coerce.date().optional(),
  email: z.string().email().optional().or(z.literal('')),
  emailPassword: z.string().optional(),
  personalEmail: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const SERVICE_TYPES = ['du_hoc', 'du_hoc_he', 'onshore', 'gia_han_visa', 'du_lich', 'dinh_cu'] as const;
const opt = z.string().optional();

const familySchema = z.object({
  fatherName: opt, fatherPhone: opt, fatherEmail: opt,
  motherName: opt, motherPhone: opt, motherEmail: opt,
  sponsorName: opt, sponsorPhone: opt, sponsorEmail: opt,
  familyOccupation: opt, familyIncome: opt, familyAssets: opt,
});

const serviceSchema = z.object({
  serviceType: z.enum(SERVICE_TYPES).optional().or(z.literal('')),
  contractCode: opt,
  contractDate: z.coerce.date().optional().or(z.literal('')),
  salesStaff: opt, processStaff: opt, processStatus: opt, processSubStatus: opt,
  csNote: opt, majorLink: opt, checklistLink: opt, strategyNote: opt, tuition: opt, invoiceFiles: opt,
});

const academicSchema = z.object({
  currentGrade: opt,
  gapYear: opt,
  highestEducation: z.string().optional(),
  schoolName: z.string().optional(),
  gpa: z.number().optional(),
  graduationYear: z.number().optional(),
  englishTest: z.enum(['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'None']).optional(),
  englishScore: z.string().optional(),
  englishTestDate: z.coerce.date().optional(),
});

const studyAbroadSchema = z.object({
  destinationCountry: z.enum(['USA', 'Canada', 'New Zealand', 'Germany', 'France']).optional(),
  intakeTerm: z.string().optional(),
  intakeYear: z.number().optional(),
  preferredUniversities: z.array(z.string()).optional(),
  preferredMajor: z.string().optional(),
  visaType: z.string().optional(),
  visaIssuedDate: z.coerce.date().optional(),
  visaExpiry: z.coerce.date().optional(),
  sevisId: z.string().optional(),
  i20Number: z.string().optional(),
  studyPermitNumber: z.string().optional(),
  dliNumber: z.string().optional(),
  nzQualificationCode: z.string().optional(),
});

export const createStudentSchema = z.object({
  personal: personalSchema.refine((p) => Boolean(p.personalEmail || p.email), {
    message: 'Cần ít nhất một email',
    path: ['personalEmail'],
  }),
  academic: academicSchema.optional(),
  studyAbroad: studyAbroadSchema.optional(),
  family: familySchema.optional(),
  service: serviceSchema.optional(),
  stage: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const notifyKeys = new Set<string>(NOTIFY_FIELDS.map((f) => f.key));

export const updateStudentSchema = z.object({
  personal: personalSchema.partial().optional(),
  // Email-only details (parent, staff, key dates); unknown keys are rejected.
  notifyInfo: z
    .record(z.string(), z.string())
    .refine((v) => Object.keys(v).every((k) => notifyKeys.has(k)), 'Unknown notifyInfo field')
    .optional(),
  academic: academicSchema.optional(),
  studyAbroad: studyAbroadSchema.optional(),
  family: familySchema.optional(),
  service: serviceSchema.optional(),
  stage: z.string().min(1).optional(),
  notes: z.string().optional(),
  pinned: z.boolean().optional(),
  caseCode: z.string().trim().max(80).optional(),
});

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  stage: z.string().optional(),
  destinationCountry: z.string().optional(),
  serviceType: z.enum(SERVICE_TYPES).optional(),
  // Quick filters: visa expiring within 30 days, open todos, next promised update due.
  quick: z.enum(['visa', 'todo', 'due', 'pinned']).optional(),
  pinned: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  sort: z.enum(['priority', 'updated', 'name-asc', 'name-desc', 'visa']).optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

const countryDbToDto: Record<string, string> = { USA: 'USA', Canada: 'Canada', NewZealand: 'New Zealand', Germany: 'Germany', France: 'France' };
const countryDtoToDb: Record<string, string> = { USA: 'USA', Canada: 'Canada', 'New Zealand': 'NewZealand', Germany: 'Germany', France: 'France' };

// Empty strings from the form mean "cleared"; for create they just stay unset.
function cleanGroup(group: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(group ?? {})) if (v !== undefined && v !== '') out[k] = v;
  return out;
}

const FAMILY_KEYS = ['fatherName', 'fatherPhone', 'fatherEmail', 'motherName', 'motherPhone', 'motherEmail', 'sponsorName', 'sponsorPhone', 'sponsorEmail', 'familyOccupation', 'familyIncome', 'familyAssets'] as const;
const SERVICE_KEYS = ['serviceType', 'contractCode', 'contractDate', 'salesStaff', 'processStaff', 'processStatus', 'processSubStatus', 'csNote', 'majorLink', 'checklistLink', 'strategyNote', 'tuition', 'invoiceFiles'] as const;

export function toCreateData(input: CreateStudentInput) {
  return {
    fullName: input.personal.fullName,
    dateOfBirth: input.personal.dateOfBirth,
    gender: input.personal.gender,
    nationality: input.personal.nationality,
    passportNumber: input.personal.passportNumber,
    passportExpiry: input.personal.passportExpiry,
    email: input.personal.email ? input.personal.email.toLowerCase().trim() : undefined,
    personalEmail: input.personal.personalEmail ? input.personal.personalEmail.toLowerCase().trim() : undefined,
    emailPassword: input.personal.emailPassword,
    phone: input.personal.phone,
    address: input.personal.address,
    highestEducation: input.academic?.highestEducation,
    schoolName: input.academic?.schoolName,
    gpa: input.academic?.gpa,
    graduationYear: input.academic?.graduationYear,
    englishTest: input.academic?.englishTest,
    englishScore: input.academic?.englishScore,
    englishTestDate: input.academic?.englishTestDate,
    destinationCountry: input.studyAbroad?.destinationCountry
      ? countryDtoToDb[input.studyAbroad.destinationCountry]
      : undefined,
    intakeTerm: input.studyAbroad?.intakeTerm,
    intakeYear: input.studyAbroad?.intakeYear,
    preferredUniversities: input.studyAbroad?.preferredUniversities ?? [],
    preferredMajor: input.studyAbroad?.preferredMajor,
    visaType: input.studyAbroad?.visaType,
    visaIssuedDate: input.studyAbroad?.visaIssuedDate,
    visaExpiry: input.studyAbroad?.visaExpiry,
    sevisId: input.studyAbroad?.sevisId,
    i20Number: input.studyAbroad?.i20Number,
    studyPermitNumber: input.studyAbroad?.studyPermitNumber,
    dliNumber: input.studyAbroad?.dliNumber,
    nzQualificationCode: input.studyAbroad?.nzQualificationCode,
    currentGrade: input.academic?.currentGrade,
    gapYear: input.academic?.gapYear,
    ...cleanGroup(input.family),
    ...cleanGroup(input.service),
    stage: input.stage ?? 'lead',
    notes: input.notes,
  };
}

export function toUpdateData(input: UpdateStudentInput) {
  const data: Record<string, unknown> = {};
  const p = input.personal;
  if (p) {
    if (p.fullName !== undefined) data.fullName = p.fullName;
    if (p.dateOfBirth !== undefined) data.dateOfBirth = p.dateOfBirth;
    if (p.gender !== undefined) data.gender = p.gender;
    if (p.nationality !== undefined) data.nationality = p.nationality;
    if (p.passportNumber !== undefined) data.passportNumber = p.passportNumber;
    if (p.passportExpiry !== undefined) data.passportExpiry = p.passportExpiry;
    if (p.email !== undefined) data.email = p.email.toLowerCase().trim();
    if (p.personalEmail !== undefined) {
      data.personalEmail = p.personalEmail.toLowerCase().trim();
      data.emailBounced = false;
    }
    if (p.emailPassword !== undefined) data.emailPassword = p.emailPassword;
    if (p.phone !== undefined) data.phone = p.phone;
    if (p.address !== undefined) data.address = p.address;
  }
  const a = input.academic;
  if (a) {
    if (a.highestEducation !== undefined) data.highestEducation = a.highestEducation;
    if (a.schoolName !== undefined) data.schoolName = a.schoolName;
    if (a.gpa !== undefined) data.gpa = a.gpa;
    if (a.graduationYear !== undefined) data.graduationYear = a.graduationYear;
    if (a.englishTest !== undefined) data.englishTest = a.englishTest;
    if (a.englishScore !== undefined) data.englishScore = a.englishScore;
    if (a.englishTestDate !== undefined) data.englishTestDate = a.englishTestDate;
  }
  const s = input.studyAbroad;
  if (s) {
    if (s.destinationCountry !== undefined) data.destinationCountry = countryDtoToDb[s.destinationCountry];
    if (s.intakeTerm !== undefined) data.intakeTerm = s.intakeTerm;
    if (s.intakeYear !== undefined) data.intakeYear = s.intakeYear;
    if (s.preferredUniversities !== undefined) data.preferredUniversities = s.preferredUniversities;
    if (s.preferredMajor !== undefined) data.preferredMajor = s.preferredMajor;
    if (s.visaType !== undefined) data.visaType = s.visaType;
    if (s.visaIssuedDate !== undefined) data.visaIssuedDate = s.visaIssuedDate;
    if (s.visaExpiry !== undefined) data.visaExpiry = s.visaExpiry;
    if (s.sevisId !== undefined) data.sevisId = s.sevisId;
    if (s.i20Number !== undefined) data.i20Number = s.i20Number;
    if (s.studyPermitNumber !== undefined) data.studyPermitNumber = s.studyPermitNumber;
    if (s.dliNumber !== undefined) data.dliNumber = s.dliNumber;
    if (s.nzQualificationCode !== undefined) data.nzQualificationCode = s.nzQualificationCode;
  }
  if (a?.currentGrade !== undefined) data.currentGrade = a.currentGrade;
  if (a?.gapYear !== undefined) data.gapYear = a.gapYear;
  for (const [group, keys] of [[input.family, FAMILY_KEYS], [input.service, SERVICE_KEYS]] as const) {
    for (const key of keys) {
      const value = (group as Record<string, unknown> | undefined)?.[key];
      if (value === undefined) continue;
      data[key] = value === '' ? null : value; // saving an emptied field clears it
    }
  }
  if (input.stage !== undefined) data.stage = input.stage;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.pinned !== undefined) data.pinned = input.pinned;
  if (input.caseCode !== undefined) data.caseCode = input.caseCode.trim() || undefined;
  for (const [key, value] of Object.entries(input.notifyInfo ?? {})) {
    data[`notifyInfo.${key}`] = value.trim();
  }
  return data;
}

type StudentLike = StudentDoc & { _id: unknown };

// Mongoose Map fields come back as Map from documents and as plain objects from .lean()/.toObject().
function notifyInfoToObject(info: unknown): Record<string, string> {
  if (!info) return {};
  if (info instanceof Map) return Object.fromEntries(info);
  return { ...(info as Record<string, string>) };
}

export function toStudentDTO(student: StudentLike, todos: TodoDoc[] = []) {
  const s = student;
  return {
    id: String(s._id),
    personal: {
      fullName: s.fullName,
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      nationality: s.nationality,
      passportNumber: s.passportNumber,
      passportExpiry: s.passportExpiry,
      email: s.email,
      emailPassword: s.emailPassword,
      personalEmail: s.personalEmail ?? undefined,
      phone: s.phone,
      address: s.address,
    },
    academic: {
      highestEducation: s.highestEducation,
      schoolName: s.schoolName,
      gpa: s.gpa,
      graduationYear: s.graduationYear,
      englishTest: s.englishTest,
      englishScore: s.englishScore,
      englishTestDate: s.englishTestDate,
      currentGrade: s.currentGrade,
      gapYear: s.gapYear,
    },
    family: Object.fromEntries(FAMILY_KEYS.map((k) => [k, s[k] ?? undefined])),
    service: Object.fromEntries(SERVICE_KEYS.map((k) => [k, s[k] ?? undefined])),
    studyAbroad: {
      destinationCountry: s.destinationCountry ? countryDbToDto[s.destinationCountry] : undefined,
      intakeTerm: s.intakeTerm,
      intakeYear: s.intakeYear,
      preferredUniversities: s.preferredUniversities,
      preferredMajor: s.preferredMajor,
      visaType: s.visaType,
      visaIssuedDate: s.visaIssuedDate,
      visaExpiry: s.visaExpiry,
      sevisId: s.sevisId,
      i20Number: s.i20Number,
      studyPermitNumber: s.studyPermitNumber,
      dliNumber: s.dliNumber,
      nzQualificationCode: s.nzQualificationCode,
    },
    stage: s.stage,
    stageOrder: s.stageOrder,
    notes: s.notes,
    caseCode: s.caseCode ?? undefined,
    notifyInfo: notifyInfoToObject(s.notifyInfo),
    notifyOptOut: Boolean(s.notifyOptOut),
    pinned: Boolean(s.pinned),
    emailBounced: Boolean(s.emailBounced),
    todos: (todos ?? [])
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((t) => ({
        id: String((t as TodoDoc & { _id: unknown })._id),
        text: t.text,
        done: t.done,
        dueDate: t.dueDate ?? undefined,
        createdAt: t.createdAt,
      })),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
