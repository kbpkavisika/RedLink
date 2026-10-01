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

// POST /api/auth/register/donor. No role field: this endpoint always creates a DONOR.
export interface RegisterDonorRequest {
  fullName: string;
  email: string;
  phone: string; // 10 digits starting with 0, e.g. 0771234567
  password: string; // 8–72 characters
  bloodGroup: BloodGroup;
  dateOfBirth: string; // ISO date; the donor must be 18–60 today
  city: string;
}

// POST /api/auth/register/hospital. The hospital starts PENDING; the person registering becomes its
// first HOSPITAL_STAFF user. Field errors come back as "hospital.name", "staff.email", …
export interface RegisterHospitalRequest {
  hospital: {
    name: string;
    registrationNo: string; // stored uppercased; must be unique
    address: string;
    city: string;
    phone: string;
  };
  staff: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  };
}

export interface ChangePasswordRequest {
  currentPassword: string; // the temporary password, if an admin set one
  newPassword: string; // 8–72 characters, different from the current one
}

export interface LoginResponse {
  token: string;
  expiresAt: string; // ISO timestamp
  user: CurrentUser;
}
