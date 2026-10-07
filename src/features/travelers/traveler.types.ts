export type DestinationCountry = 'USA' | 'Canada' | 'New Zealand' | 'Germany' | 'France';
export type TravelerStage = string;

export interface Traveler {
  id: string;
  studentId?: string;
  // Name of the linked student, filled in by the API.
  studentName?: string;
  personal: {
    fullName: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    nationality?: string;
    relationToStudent?: string;
    passportNumber?: string;
    passportExpiry?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  travel: {
    destinationCountry?: DestinationCountry;
    visaType?: string;
    purposeOfTrip?: string;
    plannedDepartureDate?: string;
    plannedReturnDate?: string;
    applicationDate?: string;
    interviewDate?: string;
    visaIssuedDate?: string;
    visaExpiry?: string;
  };
  financial: {
    sponsorName?: string;
    sponsorRelationship?: string;
    proofOfIncome?: string;
    bankStatementProvided?: boolean;
  };
  stage: TravelerStage;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TravelerListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface TravelerListParams {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  destinationCountry?: string;
  studentId?: string;
}

export interface CreateTravelerInput {
  studentId?: string;
  personal: {
    fullName: string;
    email?: string;
    phone?: string;
    relationToStudent?: string;
  };
  travel?: {
    destinationCountry?: DestinationCountry;
    visaType?: string;
    purposeOfTrip?: string;
  };
  stage?: TravelerStage;
}

export interface UpdateTravelerInput {
  studentId?: string | null;
  personal?: Partial<Traveler['personal']>;
  travel?: Partial<Traveler['travel']>;
  financial?: Partial<Traveler['financial']>;
  stage?: TravelerStage;
  notes?: string;
}

export interface TravelerDocument {
  id: string;
  traveler: string;
  category: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
  version: number;
  virusScanStatus: 'pending' | 'clean' | 'infected';
  createdAt: string;
}
