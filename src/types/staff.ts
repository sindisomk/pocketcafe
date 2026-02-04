export type StaffRole = 'kitchen' | 'floor' | 'management';
export type ContractType = 'salaried' | 'zero_rate';

export interface StaffProfile {
  id: string;
  user_id: string | null;
  name: string;
  profile_photo_url: string | null;
  role: StaffRole;
  contract_type: ContractType;
  ni_number: string | null;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

export interface StaffProfilePublic {
  id: string;
  user_id: string | null;
  name: string;
  profile_photo_url: string | null;
  role: StaffRole;
  contract_type: ContractType;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}
