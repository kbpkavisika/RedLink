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

// ---- Admin: hospitals (backend: dto/hospital) ----

export interface HospitalSummary {
  id: number;
  name: string;
  registrationNo: string;
  city: string;
  status: HospitalStatus;
  createdAt: string; // ISO timestamp: when it registered
}

export interface HospitalStaffMember {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  enabled: boolean;
}

export interface HospitalDetail extends HospitalSummary {
  address: string;
  phone: string;
  reviewedBy: string | null; // the admin who approved or rejected it
  reviewedAt: string | null;
  rejectionReason: string | null;
  staff: HospitalStaffMember[]; // first is the person who registered it
}

// PATCH /api/admin/hospitals/{id}/status. reason is required for REJECTED (max 500 characters).
export interface UpdateHospitalStatusRequest {
  status: Exclude<HospitalStatus, 'PENDING'>;
  reason?: string;
}

// ---- Admin: users (backend: dto/user) ----

export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  hospitalId?: number; // only for HOSPITAL_STAFF
  hospitalName?: string;
  enabled: boolean;
  mustChangePassword: boolean;
  createdAt: string; // ISO timestamp
}

// POST /api/admin/users: always creates HOSPITAL_STAFF for an APPROVED hospital
export interface AddStaffRequest {
  hospitalId: number;
  fullName: string;
  email: string;
  phone: string;
  temporaryPassword: string; // 8–72 characters; must be changed at first sign-in
}

export interface SetTemporaryPasswordRequest {
  temporaryPassword: string;
}

// ---- Auth (backend: dto/auth) ----

export interface CurrentUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  hospitalId?: number;
  hospitalName?: string; // only for HOSPITAL_STAFF
  hospitalCity?: string; // only for HOSPITAL_STAFF; the new-request form's default city
  hospitalStatus?: HospitalStatus; // only for HOSPITAL_STAFF; drives the Blocked state
  hospitalRejectionReason?: string; // only when hospitalStatus is REJECTED
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

// ---- Blood requests (backend: dto/request) ----

// POST /api/requests. The hospital and poster come from the signed-in staff member.
export interface CreateBloodRequestRequest {
  bloodGroup: BloodGroup;
  unitsNeeded: number; // 1–20
  urgency: Urgency;
  city: string;
  neededBy: string; // ISO timestamp, must be in the future
}

export interface BloodRequestDetail {
  id: number;
  reference: string; // "RQ-1043"; show it as "#RQ-1043"
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  urgency: Urgency;
  city: string;
  status: RequestStatus;
  neededBy: string;
  createdAt: string;
  closedAt: string | null; // set once the request stops being OPEN
  hospitalName: string;
  createdBy: string; // name of the staff member who posted it
}

// 201 from POST /api/requests
export interface PostedRequestResponse {
  request: BloodRequestDetail;
  matchCount: number; // every donor who can give right now
  notifiedCount: number; // how many of the best matches were notified
}

// GET /api/requests/{id}
export interface RequestOverview {
  request: BloodRequestDetail;
  notifiedCount: number;
  donatedDonorIds: number[]; // donors who gave blood; empty until FULFILLED
}

// PATCH /api/requests/{id}/status: close an OPEN request. Final either way.
export type UpdateRequestStatusRequest =
  | { status: 'FULFILLED'; donorIds: number[] } // donors who gave blood; each must have accepted
  | { status: 'CANCELLED' };

// ---- Donor self-service (backend: dto/donor) ----

// GET /api/donor/me: the signed-in donor's profile and eligibility
export interface DonorProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  bloodGroup: BloodGroup;
  dateOfBirth: string; // ISO date
  city: string;
  available: boolean;
  lastDonationDate: string | null; // ISO date; null = never donated
  daysSinceLastDonation: number | null;
  eligible: boolean;
  nextEligibleDate: string | null; // ISO date; only while not eligible
  daysBetweenDonations: number; // 90
}

// PATCH /api/donor/me
export interface UpdateDonorProfileRequest {
  fullName: string;
  phone: string;
  city: string;
}

// One row of GET /api/donor/requests: an open request this donor can give to. Never patient details.
export interface IncomingRequest {
  requestId: number;
  reference: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  urgency: Urgency;
  city: string;
  neededBy: string;
  createdAt: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  exactMatch: boolean; // the request is for the donor's own group
  sameCity: boolean; // the request is in the donor's city
  myResponse: ResponseStatus | null; // null = not answered yet
  respondedAt: string | null;
}

// GET /api/donor/donations (D10)
export interface DonationHistory {
  totalDonations: number;
  totalUnits: number;
  livesHelped: number; // one per donation
  eligible: boolean;
  nextEligibleDate: string | null; // ISO date; only while not eligible
  donations: DonationItem[]; // newest first
}

export interface DonationItem {
  id: number;
  donationDate: string; // ISO date
  units: number;
  hospitalName: string;
  hospitalCity: string;
  requestId: number | null; // null for a donation not linked to a request
  reference: string | null; // "RQ-12"
}

// One row of GET /api/requests/{id}/responses (hospital staff), accepted first
export interface RequestResponse {
  donorId: number;
  name: string;
  phone: string | null;
  bloodGroup: BloodGroup;
  city: string;
  status: ResponseStatus;
  respondedAt: string;
  updatedAt: string;
}

// One row of a request list: GET /api/requests (hospital) and GET /api/admin/requests (admin)
export interface RequestListItem {
  id: number;
  reference: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  urgency: Urgency;
  city: string;
  status: RequestStatus;
  neededBy: string;
  createdAt: string;
  closedAt: string | null;
  createdBy: string;
  hospitalId: number;
  hospitalName: string;
  coming: number; // accepted and not withdrawn
  withdrew: number;
  declined: number;
  donated: number; // donations recorded when fulfilled
}

// GET /api/requests (H11): the hospital's dashboard numbers and every request, newest first
export interface HospitalRequestList {
  open: number;
  criticalOpen: number;
  fulfilledLast30Days: number;
  donorsComing: number; // on open requests
  requests: RequestListItem[];
}

// GET /api/admin/requests/{id} (A8): read-only
export interface AdminRequestDetail {
  request: BloodRequestDetail;
  hospitalId: number;
  hospitalCity: string;
  hospitalPhone: string;
  notifiedCount: number;
  responses: RequestResponse[];
  donatedDonorIds: number[];
}

// One row of GET /api/requests/{id}/matches, best match first
export interface MatchedDonor {
  donorId: number;
  name: string;
  phone: string | null;
  bloodGroup: BloodGroup;
  city: string;
  lastDonationDate: string | null; // ISO date; null = never donated
  daysSinceLastDonation: number | null;
  exactMatch: boolean; // same blood group as requested (otherwise a compatible substitute)
  sameCity: boolean; // same city as the request
}

// ---- Notifications (backend: dto/notification) ----

// GET /api/notifications: the latest 100, newest first
export interface NotificationFeed {
  unreadCount: number; // all unread, even older than the items returned
  items: NotificationItem[];
}

export interface NotificationItem {
  id: number;
  message: string;
  read: boolean;
  createdAt: string; // ISO timestamp
  requestId: number | null; // the request it's about; null for e.g. a hospital decision
  reference: string | null; // "RQ-12"
}
