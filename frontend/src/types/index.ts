// Types that mirror the backend. Keep names and values identical to the Java enums and DTOs.

// ---- Enums (backend: model/enums) ----

// The API uses a plain hyphen ("A-"). Show the true minus sign ("A−") only in the UI.
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export type Role = 'ADMIN' | 'HOSPITAL_STAFF' | 'DONOR';
export type HospitalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RequestStatus = 'OPEN' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ResponseStatus = 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

// ---- Errors (backend: dto/ApiError) ----

export interface FieldError {
  field: string;
  message: string;
}

// Every error response from the API has this shape
export interface ApiError {
  status: number;
  error: string;
  message: string;
  fieldErrors: FieldError[];
  ref: string;
  timestamp: string;
  path: string;
}

// ---- Donors (backend: dto/DonorSummary) ----

export interface DonorSummary {
  id: number;
  name: string;
  bloodGroup: BloodGroup;
  phone: string;
  city: string;
  available: boolean;
  lastDonationDate: string | null; // ISO date, e.g. "2026-05-01"
}

// ---- Auth (planned: POST /api/auth/login, GET /api/auth/me) ----

export interface CurrentUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  hospitalId?: number;
  hospitalStatus?: HospitalStatus; // only for HOSPITAL_STAFF; drives the Blocked state
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean; // true → 7-day token instead of 12 hours
}

export interface LoginResponse {
  token: string;
  expiresAt: string; // ISO timestamp
  user: CurrentUser;
}
