import { z } from 'zod';
import type { TravelerDoc } from '@/models/Traveler';

const personalSchema = z.object({
  fullName: z.string().min(2),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  nationality: z.string().optional(),
  relationToStudent: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.coerce.date().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const travelSchema = z.object({
  destinationCountry: z.enum(['USA', 'Canada', 'New Zealand', 'Germany', 'France']).optional(),
  visaType: z.string().optional(),
  purposeOfTrip: z.string().optional(),
  plannedDepartureDate: z.coerce.date().optional(),
  plannedReturnDate: z.coerce.date().optional(),
  applicationDate: z.coerce.date().optional(),
  interviewDate: z.coerce.date().optional(),
  visaIssuedDate: z.coerce.date().optional(),
  visaExpiry: z.coerce.date().optional(),
});

const financialSchema = z.object({
  sponsorName: z.string().optional(),
  sponsorRelationship: z.string().optional(),
  proofOfIncome: z.string().optional(),
  bankStatementProvided: z.boolean().optional(),
});

export const createTravelerSchema = z.object({
  studentId: z.string().optional(),
  personal: personalSchema,
  travel: travelSchema.optional(),
  financial: financialSchema.optional(),
  stage: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export const updateTravelerSchema = z.object({
  studentId: z.string().nullable().optional(),
  personal: personalSchema.partial().optional(),
  travel: travelSchema.optional(),
  financial: financialSchema.optional(),
  stage: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export const listTravelersQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  stage: z.string().optional(),
  destinationCountry: z.string().optional(),
  studentId: z.string().optional(),
});

export type CreateTravelerInput = z.infer<typeof createTravelerSchema>;
export type UpdateTravelerInput = z.infer<typeof updateTravelerSchema>;

const countryDbToDto: Record<string, string> = { USA: 'USA', Canada: 'Canada', NewZealand: 'New Zealand', Germany: 'Germany', France: 'France' };
const countryDtoToDb: Record<string, string> = { USA: 'USA', Canada: 'Canada', 'New Zealand': 'NewZealand', Germany: 'Germany', France: 'France' };

export function toCreateData(input: CreateTravelerInput) {
  return {
    studentId: input.studentId ?? undefined,
    fullName: input.personal.fullName,
    dateOfBirth: input.personal.dateOfBirth,
    gender: input.personal.gender,
    nationality: input.personal.nationality,
    relationToStudent: input.personal.relationToStudent,
    passportNumber: input.personal.passportNumber,
    passportExpiry: input.personal.passportExpiry,
    email: input.personal.email,
    phone: input.personal.phone,
    address: input.personal.address,
    destinationCountry: input.travel?.destinationCountry
      ? countryDtoToDb[input.travel.destinationCountry]
      : undefined,
    visaType: input.travel?.visaType,
    purposeOfTrip: input.travel?.purposeOfTrip,
    plannedDepartureDate: input.travel?.plannedDepartureDate,
    plannedReturnDate: input.travel?.plannedReturnDate,
    applicationDate: input.travel?.applicationDate,
    interviewDate: input.travel?.interviewDate,
    visaIssuedDate: input.travel?.visaIssuedDate,
    visaExpiry: input.travel?.visaExpiry,
    sponsorName: input.financial?.sponsorName,
    sponsorRelationship: input.financial?.sponsorRelationship,
    proofOfIncome: input.financial?.proofOfIncome,
    bankStatementProvided: input.financial?.bankStatementProvided ?? false,
    stage: input.stage ?? 'lead',
    notes: input.notes,
  };
}

export function toUpdateData(input: UpdateTravelerInput) {
  const data: Record<string, unknown> = {};
  if (input.studentId !== undefined) {
    data.studentId = input.studentId ?? null;
  }
  const p = input.personal;
  if (p) {
    if (p.fullName !== undefined) data.fullName = p.fullName;
    if (p.dateOfBirth !== undefined) data.dateOfBirth = p.dateOfBirth;
    if (p.gender !== undefined) data.gender = p.gender;
    if (p.nationality !== undefined) data.nationality = p.nationality;
    if (p.relationToStudent !== undefined) data.relationToStudent = p.relationToStudent;
    if (p.passportNumber !== undefined) data.passportNumber = p.passportNumber;
    if (p.passportExpiry !== undefined) data.passportExpiry = p.passportExpiry;
    if (p.email !== undefined) data.email = p.email;
    if (p.phone !== undefined) data.phone = p.phone;
    if (p.address !== undefined) data.address = p.address;
  }
  const t = input.travel;
  if (t) {
    if (t.destinationCountry !== undefined) data.destinationCountry = countryDtoToDb[t.destinationCountry];
    if (t.visaType !== undefined) data.visaType = t.visaType;
    if (t.purposeOfTrip !== undefined) data.purposeOfTrip = t.purposeOfTrip;
    if (t.plannedDepartureDate !== undefined) data.plannedDepartureDate = t.plannedDepartureDate;
    if (t.plannedReturnDate !== undefined) data.plannedReturnDate = t.plannedReturnDate;
    if (t.applicationDate !== undefined) data.applicationDate = t.applicationDate;
    if (t.interviewDate !== undefined) data.interviewDate = t.interviewDate;
    if (t.visaIssuedDate !== undefined) data.visaIssuedDate = t.visaIssuedDate;
    if (t.visaExpiry !== undefined) data.visaExpiry = t.visaExpiry;
  }
  const f = input.financial;
  if (f) {
    if (f.sponsorName !== undefined) data.sponsorName = f.sponsorName;
    if (f.sponsorRelationship !== undefined) data.sponsorRelationship = f.sponsorRelationship;
    if (f.proofOfIncome !== undefined) data.proofOfIncome = f.proofOfIncome;
    if (f.bankStatementProvided !== undefined) data.bankStatementProvided = f.bankStatementProvided;
  }
  if (input.stage !== undefined) data.stage = input.stage;
  if (input.notes !== undefined) data.notes = input.notes;
  return data;
}

type TravelerLike = TravelerDoc & { _id: unknown };

export function toTravelerDTO(traveler: TravelerLike, studentName?: string) {
  const t = traveler;
  return {
    id: String(t._id),
    studentId: t.studentId ?? undefined,
    studentName,
    personal: {
      fullName: t.fullName,
      dateOfBirth: t.dateOfBirth,
      gender: t.gender,
      nationality: t.nationality,
      relationToStudent: t.relationToStudent,
      passportNumber: t.passportNumber,
      passportExpiry: t.passportExpiry,
      email: t.email,
      phone: t.phone,
      address: t.address,
    },
    travel: {
      destinationCountry: t.destinationCountry ? countryDbToDto[t.destinationCountry] : undefined,
      visaType: t.visaType,
      purposeOfTrip: t.purposeOfTrip,
      plannedDepartureDate: t.plannedDepartureDate,
      plannedReturnDate: t.plannedReturnDate,
      applicationDate: t.applicationDate,
      interviewDate: t.interviewDate,
      visaIssuedDate: t.visaIssuedDate,
      visaExpiry: t.visaExpiry,
    },
    financial: {
      sponsorName: t.sponsorName,
      sponsorRelationship: t.sponsorRelationship,
      proofOfIncome: t.proofOfIncome,
      bankStatementProvided: t.bankStatementProvided,
    },
    stage: t.stage,
    stageOrder: t.stageOrder,
    notes: t.notes,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
