export type StaffRole = 'kitchen' | 'floor' | 'management' | 'bar';
export type ContractType = 'salaried' | 'zero_rate';

export type JobTitle = 
  // Service (Front of House)
  | 'server'
  | 'host'
  | 'bartender'
  | 'barback'
  | 'busser'
  | 'food_runner'
  // Kitchen (Back of House)
  | 'head_chef'
  | 'sous_chef'
  | 'line_cook'
  | 'prep_cook'
  | 'dishwasher'
  | 'kitchen_porter'
  // Bar
  | 'bar_manager'
  | 'mixologist'
  // Management
  | 'general_manager'
  | 'assistant_manager'
  | 'shift_supervisor'
  | 'floor_manager';

export interface JobTitleOption {
  value: JobTitle;
  label: string;
  department: StaffRole;
}

// Grouped job titles by department
export const JOB_TITLES: JobTitleOption[] = [
  // Service (Front of House)
  { value: 'server', label: 'Server', department: 'floor' },
  { value: 'host', label: 'Host/Hostess', department: 'floor' },
  { value: 'busser', label: 'Busser', department: 'floor' },
  { value: 'food_runner', label: 'Food Runner', department: 'floor' },
  // Kitchen (Back of House)
  { value: 'head_chef', label: 'Head Chef', department: 'kitchen' },
  { value: 'sous_chef', label: 'Sous Chef', department: 'kitchen' },
  { value: 'line_cook', label: 'Line Cook', department: 'kitchen' },
  { value: 'prep_cook', label: 'Prep Cook', department: 'kitchen' },
  { value: 'dishwasher', label: 'Dishwasher', department: 'kitchen' },
  { value: 'kitchen_porter', label: 'Kitchen Porter', department: 'kitchen' },
  // Bar
  { value: 'bartender', label: 'Bartender', department: 'bar' },
  { value: 'barback', label: 'Barback', department: 'bar' },
  { value: 'bar_manager', label: 'Bar Manager', department: 'bar' },
  { value: 'mixologist', label: 'Mixologist', department: 'bar' },
  // Management
  { value: 'general_manager', label: 'General Manager', department: 'management' },
  { value: 'assistant_manager', label: 'Assistant Manager', department: 'management' },
  { value: 'shift_supervisor', label: 'Shift Supervisor', department: 'management' },
  { value: 'floor_manager', label: 'Floor Manager', department: 'management' },
];

export const DEPARTMENT_LABELS: Record<StaffRole, string> = {
  floor: 'Service (Front of House)',
  kitchen: 'Kitchen (Back of House)',
  bar: 'Bar',
  management: 'Management',
};

export interface StaffProfile {
  id: string;
  user_id: string | null;
  name: string;
  profile_photo_url: string | null;
  role: StaffRole;
  job_title: JobTitle | null;
  contract_type: ContractType;
  ni_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  start_date: string | null;
  hourly_rate: number;
  tax_code: string | null;
  nic_category: string | null;
  created_at: string;
  updated_at: string;
 }
 
 export interface StaffProfileWithEnrollment extends StaffProfile {
   face_token?: string | null;
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
