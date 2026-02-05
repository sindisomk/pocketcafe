 import { AttendanceRecord } from '@/types/attendance';
 import { StaffProfile } from '@/types/staff';
 import { PayrollSummary, ComplianceWarning } from '@/types/attendance';
 import { Shift } from '@/types/schedule';
 import { differenceInHours, differenceInMinutes, parseISO, format } from 'date-fns';
 
 // UK statutory holiday accrual rate for zero-hour contracts
 const HOLIDAY_ACCRUAL_RATE = 0.1207; // 12.07%
 
 // UK minimum rest period between shifts (Working Time Regulations)
 const MIN_REST_HOURS = 11;
 
 // Paid break duration in hours
 const PAID_BREAK_HOURS = 0.5; // 30 minutes
 
// Overtime threshold (hours per week before overtime kicks in)
const WEEKLY_OVERTIME_THRESHOLD = 40;

// Overtime pay multiplier (1.5x = time and a half)
const OVERTIME_MULTIPLIER = 1.5;

 /**
  * Calculate hours worked from an attendance record
  * Includes the 30-minute paid break in total hours
  */
 export function calculateHoursWorked(record: AttendanceRecord): number {
   if (!record.clock_out_time) return 0;
 
   const clockIn = parseISO(record.clock_in_time);
   const clockOut = parseISO(record.clock_out_time);
   
   const totalMinutes = differenceInMinutes(clockOut, clockIn);
   
   // Subtract break duration if break was taken
   let breakMinutes = 0;
   if (record.break_start_time && record.break_end_time) {
     breakMinutes = differenceInMinutes(
       parseISO(record.break_end_time),
       parseISO(record.break_start_time)
     );
   }
   
   // Total hours = actual work time (break is paid, so we count it)
   // The 30-min break is PAID, so we include it in the total
   const totalHours = totalMinutes / 60;
   
   return Math.round(totalHours * 100) / 100;
 }
 
 /**
  * Generate payroll summary for a staff member
 * Includes overtime calculation for hours over 40/week
  */
 export function generatePayrollSummary(
   staff: StaffProfile,
   attendanceRecords: AttendanceRecord[]
 ): PayrollSummary {
   const staffRecords = attendanceRecords.filter(
     (r) => r.staff_id === staff.id && r.clock_out_time
   );
 
   let totalHoursWorked = 0;
   let paidBreakHours = 0;
 
   staffRecords.forEach((record) => {
     totalHoursWorked += calculateHoursWorked(record);
     
     // Count break hours that were taken
     if (record.break_start_time && record.break_end_time) {
       const breakMins = differenceInMinutes(
         parseISO(record.break_end_time),
         parseISO(record.break_start_time)
       );
       paidBreakHours += breakMins / 60;
     } else {
       // If no break logged, assume 30-min paid break was included
       paidBreakHours += PAID_BREAK_HOURS;
     }
   });
 
  // Calculate overtime (hours over 40 in the week)
  const regularHoursWorked = Math.min(totalHoursWorked, WEEKLY_OVERTIME_THRESHOLD);
  const overtimeHours = Math.max(0, totalHoursWorked - WEEKLY_OVERTIME_THRESHOLD);
  
  // Regular pay + overtime pay (1.5x rate)
  const regularPay = regularHoursWorked * staff.hourly_rate;
  const overtimePay = overtimeHours * staff.hourly_rate * OVERTIME_MULTIPLIER;
  const grossPay = regularPay + overtimePay;
   
   // Holiday accrual only applies to zero-hour contracts
   const holidayAccrual = staff.contract_type === 'zero_rate' 
     ? grossPay * HOLIDAY_ACCRUAL_RATE 
     : 0;
 
   return {
     staffId: staff.id,
     staffName: staff.name,
     totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
     paidBreakHours: Math.round(paidBreakHours * 100) / 100,
    regularHours: Math.round(regularHoursWorked * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
     hourlyRate: staff.hourly_rate,
     grossPay: Math.round(grossPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
     holidayAccrual: Math.round(holidayAccrual * 100) / 100,
   };
 }
 
 /**
  * Check for UK Working Time Regulations violations
  * Staff must have at least 11 hours rest between shifts
  */
 export function checkRestPeriodViolations(
   shifts: Shift[],
   staffProfiles: StaffProfile[]
 ): ComplianceWarning[] {
   const warnings: ComplianceWarning[] = [];
   
   // Group shifts by staff
   const shiftsByStaff = new Map<string, Shift[]>();
   shifts.forEach((shift) => {
     const current = shiftsByStaff.get(shift.staff_id) || [];
     current.push(shift);
     shiftsByStaff.set(shift.staff_id, current);
   });
 
   shiftsByStaff.forEach((staffShifts, staffId) => {
     const staff = staffProfiles.find((s) => s.id === staffId);
     if (!staff) return;
 
     // Sort by date and time
     const sorted = [...staffShifts].sort((a, b) => {
       const dateA = `${a.shift_date}T${a.start_time}`;
       const dateB = `${b.shift_date}T${b.start_time}`;
       return dateA.localeCompare(dateB);
     });
 
     // Check consecutive shifts for rest period violations
     for (let i = 0; i < sorted.length - 1; i++) {
       const currentShift = sorted[i];
       const nextShift = sorted[i + 1];
 
       const currentEnd = parseISO(`${currentShift.shift_date}T${currentShift.end_time}`);
       const nextStart = parseISO(`${nextShift.shift_date}T${nextShift.start_time}`);
 
       const restHours = differenceInHours(nextStart, currentEnd);
 
       if (restHours < MIN_REST_HOURS) {
         warnings.push({
           type: 'rest_period_violation',
           staffId,
           staffName: staff.name,
           message: `Only ${restHours}h rest between shifts (minimum 11h required)`,
           shiftDate: nextShift.shift_date,
           previousShiftEnd: format(currentEnd, 'EEE HH:mm'),
           nextShiftStart: format(nextStart, 'EEE HH:mm'),
           restHours,
         });
       }
     }
   });
 
   return warnings;
 }
 
 /**
  * Export payroll data to CSV format
  */
 export function exportPayrollCSV(summaries: PayrollSummary[], periodStart: string, periodEnd: string): string {
   const headers = [
     'Staff Name',
     'Total Hours Worked',
     'Paid Break Hours',
     'Regular Hours',
    'Overtime Hours',
     'Hourly Rate (£)',
    'Overtime Pay (£)',
     'Gross Pay (£)',
     'Holiday Accrual (£)',
   ];
 
   const rows = summaries.map((s) => [
     s.staffName,
     s.totalHoursWorked.toFixed(2),
     s.paidBreakHours.toFixed(2),
     s.regularHours.toFixed(2),
    s.overtimeHours.toFixed(2),
     s.hourlyRate.toFixed(2),
    s.overtimePay.toFixed(2),
     s.grossPay.toFixed(2),
     s.holidayAccrual.toFixed(2),
   ]);
 
   const csvContent = [
     `PocketCafe Payroll Report`,
     `Period: ${periodStart} to ${periodEnd}`,
     `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
     '',
     headers.join(','),
     ...rows.map((row) => row.join(',')),
     '',
    `Total Overtime Pay,,,,,,£${summaries.reduce((sum, s) => sum + s.overtimePay, 0).toFixed(2)},`,
    `Total Gross Pay,,,,,,,£${summaries.reduce((sum, s) => sum + s.grossPay, 0).toFixed(2)},`,
    `Total Holiday Accrual,,,,,,,,£${summaries.reduce((sum, s) => sum + s.holidayAccrual, 0).toFixed(2)}`,
   ];
 
   return csvContent.join('\n');
 }