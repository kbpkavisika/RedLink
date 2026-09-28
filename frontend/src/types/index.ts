export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Donor {
  id: number;
  name: string;
  bloodGroup: BloodGroup;
  phone: string;
  city: string;
  available: boolean;
  lastDonationDate?: string;
}
