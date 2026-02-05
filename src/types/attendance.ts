 export type AttendanceStatus = 'clocked_in' | 'on_break' | 'clocked_out';
 export type LeaveStatus = 'pending' | 'approved' | 'rejected';
 
export interface AttendanceRecord {
  id: string;
  staff_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  status: AttendanceStatus;
  override_by: string | null;
  override_pin_used: boolean;
  face_match_confidence: number | null;
  notes: string | null;
  // Lateness tracking fields
  scheduled_start_time: string | null;
  is_late: boolean;
  late_minutes: number;
  created_at: string;
  updated_at: string;
}
 
 export interface AttendanceRecordWithStaff extends AttendanceRecord {
   staff_profiles: {
     id: string;
     name: string;
     profile_photo_url: string | null;
     role: string;
   };
 }
 
 export interface LeaveRequest {
   id: string;
   staff_id: string;
   start_date: string;
   end_date: string;
   reason: string | null;
   status: LeaveStatus;
   reviewed_by: string | null;
   reviewed_at: string | null;
   review_notes: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export interface LeaveRequestWithStaff extends LeaveRequest {
   staff_profiles: {
     id: string;
     name: string;
     profile_photo_url: string | null;
   };
 }
 
// Payroll calculation types
export interface PayrollSummary {
  staffId: string;
  staffName: string;
  totalHoursWorked: number;
  paidBreakHours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  grossPay: number;
  overtimePay: number;
  holidayAccrual: number; // 12.07% for zero-hour contracts
  // Tax & NIC deductions
  taxCode: string;
  nicCategory: string;
  incomeTax: number;      // PAYE income tax
  employeeNIC: number;    // Employee National Insurance
  netPay: number;         // Take-home pay after deductions
  // Lateness tracking
  lateCount: number;
  totalLateMinutes: number;
}
 
 // UK Compliance types
 export interface ComplianceWarning {
   type: 'rest_period_violation' | 'overtime_warning';
   staffId: string;
   staffName: string;
   message: string;
   shiftDate: string;
   previousShiftEnd?: string;
   nextShiftStart?: string;
   restHours?: number;
 }