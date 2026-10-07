export type DestinationCountry = 'USA' | 'Canada' | 'New Zealand' | 'Germany' | 'France';
export type StudentStage = string;
export type ServiceType = 'du_hoc' | 'du_hoc_he' | 'onshore' | 'gia_han_visa' | 'du_lich' | 'dinh_cu';

export const SERVICE_LABELS: Record<ServiceType, string> = {
  du_hoc: 'Du học',
  du_hoc_he: 'Du học hè',
  onshore: 'Onshore',
  gia_han_visa: 'Gia hạn visa',
  du_lich: 'Du lịch',
  dinh_cu: 'Định cư',
};

export interface StudentFamily {
  fatherName?: string; fatherPhone?: string; fatherEmail?: string;
  motherName?: string; motherPhone?: string; motherEmail?: string;
  sponsorName?: string; sponsorPhone?: string; sponsorEmail?: string;
  familyOccupation?: string; familyIncome?: string; familyAssets?: string;
}

export interface StudentService {
  serviceType?: ServiceType | '';
  contractCode?: string;
  contractDate?: string;
  salesStaff?: string;
  processStaff?: string;
  processStatus?: string;
  processSubStatus?: string;
  csNote?: string;
  majorLink?: string;
  checklistLink?: string;
  strategyNote?: string;
  tuition?: string;
  invoiceFiles?: string;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  personal: {
    fullName: string;
    // Company-created mailbox (with password) — not used for progress emails.
    email?: string;
    emailPassword?: string;
    // Student's own address; progress-update emails go here.
    personalEmail?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    nationality?: string;
    passportNumber?: string;
    address?: string;
  };
  academic: {
    highestEducation?: string;
    schoolName?: string;
    gpa?: number;
    graduationYear?: number;
    englishTest?: 'IELTS' | 'TOEFL' | 'PTE' | 'Duolingo' | 'None';
    englishScore?: string;
    englishTestDate?: string;
    currentGrade?: string;
    gapYear?: string;
  };
  family: StudentFamily;
  service: StudentService;
  studyAbroad: {
    destinationCountry?: DestinationCountry;
    intakeTerm?: string;
    intakeYear?: number;
    preferredUniversities?: string[];
    preferredMajor?: string;
    visaIssuedDate?: string;
    visaExpiry?: string;
  };
  stage: StudentStage;
  notes?: string;
  caseCode?: string;
  notifyInfo: Record<string, string>;
  notifyOptOut: boolean;
  pinned: boolean;
  emailBounced: boolean;
  todos: Todo[];
  createdAt: string;
}

export interface StudentListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  // Counts for the filter chips, computed over all matching students (not just this page).
  facets?: {
    all: number;
    countries: Record<string, number>;
    stages: Record<string, number>;
    due: number;
  };
}

export interface StudentListParams {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  destinationCountry?: string;
  serviceType?: ServiceType;
  quick?: 'visa' | 'todo' | 'due' | 'pinned';
  pinned?: boolean;
  sort?: 'priority' | 'updated' | 'name-asc' | 'name-desc' | 'visa';
}

export interface CreateStudentInput {
  personal: {
    fullName: string;
    personalEmail: string;
    email?: string;
    phone?: string;
  };
  studyAbroad?: {
    destinationCountry?: DestinationCountry;
    preferredMajor?: string;
  };
  service?: { serviceType?: ServiceType };
  stage?: StudentStage;
}

export interface UpdateStudentInput {
  personal?: Partial<Student['personal']>;
  academic?: Partial<Student['academic']>;
  studyAbroad?: Partial<Student['studyAbroad']>;
  family?: Partial<StudentFamily>;
  service?: Partial<StudentService>;
  stage?: StudentStage;
  notes?: string;
  pinned?: boolean;
  caseCode?: string;
  notifyInfo?: Record<string, string>;
}
