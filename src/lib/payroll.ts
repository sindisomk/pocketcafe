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

 // ============================================
 // UK PAYE Income Tax Thresholds 2024/25
 // ============================================
 // Personal Allowance: £12,570/year = £242/week = £1,048/month
 // Basic Rate (20%): £12,571 - £50,270
 // Higher Rate (40%): £50,271 - £125,140
 // Additional Rate (45%): Over £125,140
 
 const TAX_PERSONAL_ALLOWANCE_WEEKLY = 242;
 const TAX_BASIC_RATE_LIMIT_WEEKLY = 967; // (£50,270 - £12,570) / 52
 const TAX_HIGHER_RATE_LIMIT_WEEKLY = 2165; // (£125,140 - £12,570) / 52
 
 const TAX_BASIC_RATE = 0.20;
 const TAX_HIGHER_RATE = 0.40;
 const TAX_ADDITIONAL_RATE = 0.45;
 
 // ============================================
 // UK National Insurance Thresholds 2024/25
 // ============================================
 // Primary Threshold: £242/week (£1,048/month, £12,570/year)
 // Upper Earnings Limit: £967/week (£4,189/month, £50,270/year)
 // Employee NIC rate: 8% between PT and UEL
 // Employee NIC rate: 2% above UEL
 
 const NIC_PRIMARY_THRESHOLD_WEEKLY = 242;
 const NIC_UPPER_EARNINGS_LIMIT_WEEKLY = 967;
 const NIC_MAIN_RATE = 0.08;    // 8% (reduced from 12% in Jan 2024)
 const NIC_UPPER_RATE = 0.02;   // 2% above UEL
 
 // NIC Category adjustments (percentage modifiers)
 const NIC_CATEGORY_RATES: Record<string, { mainRate: number; upperRate: number }> = {
   'A': { mainRate: 0.08, upperRate: 0.02 },  // Standard rate
   'B': { mainRate: 0.0585, upperRate: 0.02 }, // Married women's reduced rate
   'C': { mainRate: 0, upperRate: 0 },         // Over State Pension age
   'F': { mainRate: 0.08, upperRate: 0.02 },   // Freeport standard
   'H': { mainRate: 0.08, upperRate: 0.02 },   // Apprentice under 25
   'J': { mainRate: 0, upperRate: 0.02 },      // Deferment
   'M': { mainRate: 0.08, upperRate: 0.02 },   // Under 21
   'V': { mainRate: 0, upperRate: 0.02 },      // Veteran first year
   'Z': { mainRate: 0, upperRate: 0.02 },      // Under 21 deferment
 };
 
 /**
  * Parse UK tax code to get personal allowance
  * Common codes: 1257L (standard), BR (basic rate only), 0T (no allowance)
  */
 function parseUKTaxCode(taxCode: string): { allowance: number; isBasicRateOnly: boolean } {
   const code = (taxCode || '1257L').toUpperCase().trim();
   
   // BR = Basic Rate only (no personal allowance)
   if (code === 'BR') {
     return { allowance: 0, isBasicRateOnly: true };
   }
   
   // D0 = Higher rate (40%) on all income
   if (code === 'D0') {
     return { allowance: 0, isBasicRateOnly: false };
   }
   
   // D1 = Additional rate (45%) on all income
   if (code === 'D1') {
     return { allowance: 0, isBasicRateOnly: false };
   }
   
   // NT = No Tax
   if (code === 'NT') {
     return { allowance: Infinity, isBasicRateOnly: false };
   }
   
   // 0T = No personal allowance
   if (code === '0T') {
     return { allowance: 0, isBasicRateOnly: false };
   }
   
   // Extract numeric portion (e.g., 1257L -> 1257)
   const match = code.match(/^([SC]?)(\d+)/);
   if (match) {
     const numericPart = parseInt(match[2], 10);
     // Tax codes represent allowance in £10s
     const weeklyAllowance = (numericPart * 10) / 52;
     return { allowance: weeklyAllowance, isBasicRateOnly: false };
   }
   
   // Default to standard personal allowance
   return { allowance: TAX_PERSONAL_ALLOWANCE_WEEKLY, isBasicRateOnly: false };
 }
 
 /**
  * Calculate UK PAYE income tax (weekly basis)
  */
 export function calculatePAYE(weeklyGross: number, taxCode: string): number {
   const { allowance, isBasicRateOnly } = parseUKTaxCode(taxCode);
   
   // NT code = no tax
   if (allowance === Infinity) {
     return 0;
   }
   
   // BR code = 20% on everything
   if (isBasicRateOnly) {
     return Math.max(0, weeklyGross * TAX_BASIC_RATE);
   }
   
   // D0 code = 40% on everything
   if (taxCode.toUpperCase() === 'D0') {
     return Math.max(0, weeklyGross * TAX_HIGHER_RATE);
   }
   
   // D1 code = 45% on everything
   if (taxCode.toUpperCase() === 'D1') {
     return Math.max(0, weeklyGross * TAX_ADDITIONAL_RATE);
   }
   
   // Taxable income after personal allowance
   const taxableIncome = Math.max(0, weeklyGross - allowance);
   
   if (taxableIncome <= 0) {
     return 0;
   }
   
   let tax = 0;
   
   // Basic rate band (20%)
   const basicRatePortion = Math.min(taxableIncome, TAX_BASIC_RATE_LIMIT_WEEKLY);
   tax += basicRatePortion * TAX_BASIC_RATE;
   
   // Higher rate band (40%)
   if (taxableIncome > TAX_BASIC_RATE_LIMIT_WEEKLY) {
     const higherRatePortion = Math.min(
       taxableIncome - TAX_BASIC_RATE_LIMIT_WEEKLY,
       TAX_HIGHER_RATE_LIMIT_WEEKLY - TAX_BASIC_RATE_LIMIT_WEEKLY
     );
     tax += higherRatePortion * TAX_HIGHER_RATE;
   }
   
   // Additional rate band (45%)
   if (taxableIncome > TAX_HIGHER_RATE_LIMIT_WEEKLY) {
     const additionalRatePortion = taxableIncome - TAX_HIGHER_RATE_LIMIT_WEEKLY;
     tax += additionalRatePortion * TAX_ADDITIONAL_RATE;
   }
   
   return Math.round(tax * 100) / 100;
 }
 
 /**
  * Calculate UK Employee National Insurance Contributions (weekly basis)
  */
 export function calculateEmployeeNIC(weeklyGross: number, nicCategory: string): number {
   const rates = NIC_CATEGORY_RATES[nicCategory?.toUpperCase()] || NIC_CATEGORY_RATES['A'];
   
   // No NIC if below primary threshold
   if (weeklyGross <= NIC_PRIMARY_THRESHOLD_WEEKLY) {
     return 0;
   }
   
   let nic = 0;
   
   // Main rate on earnings between Primary Threshold and Upper Earnings Limit
   const mainRateEarnings = Math.min(
     weeklyGross - NIC_PRIMARY_THRESHOLD_WEEKLY,
     NIC_UPPER_EARNINGS_LIMIT_WEEKLY - NIC_PRIMARY_THRESHOLD_WEEKLY
   );
   nic += mainRateEarnings * rates.mainRate;
   
   // Upper rate on earnings above UEL
   if (weeklyGross > NIC_UPPER_EARNINGS_LIMIT_WEEKLY) {
     const upperRateEarnings = weeklyGross - NIC_UPPER_EARNINGS_LIMIT_WEEKLY;
     nic += upperRateEarnings * rates.upperRate;
   }
   
   return Math.round(nic * 100) / 100;
 }
 
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
    // Tax & NIC calculations
    taxCode: staff.tax_code || '1257L',
    nicCategory: staff.nic_category || 'A',
    incomeTax: Math.round(calculatePAYE(grossPay, staff.tax_code || '1257L') * 100) / 100,
    employeeNIC: Math.round(calculateEmployeeNIC(grossPay, staff.nic_category || 'A') * 100) / 100,
    netPay: Math.round((grossPay - calculatePAYE(grossPay, staff.tax_code || '1257L') - calculateEmployeeNIC(grossPay, staff.nic_category || 'A')) * 100) / 100,
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
    'Tax Code',
    'PAYE Tax (£)',
    'NIC Category',
    'Employee NIC (£)',
    'Net Pay (£)',
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
    s.taxCode,
    s.incomeTax.toFixed(2),
    s.nicCategory,
    s.employeeNIC.toFixed(2),
    s.netPay.toFixed(2),
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
   `Total Gross Pay,,,,,,,£${summaries.reduce((sum, s) => sum + s.grossPay, 0).toFixed(2)},,,,,`,
   `Total Holiday Accrual,,,,,,,,£${summaries.reduce((sum, s) => sum + s.holidayAccrual, 0).toFixed(2)},,,,`,
   `Total PAYE Tax,,,,,,,,,,£${summaries.reduce((sum, s) => sum + s.incomeTax, 0).toFixed(2)},,,`,
   `Total Employee NIC,,,,,,,,,,,,£${summaries.reduce((sum, s) => sum + s.employeeNIC, 0).toFixed(2)},`,
   `Total Net Pay,,,,,,,,,,,,,£${summaries.reduce((sum, s) => sum + s.netPay, 0).toFixed(2)}`,
   ];
 
   return csvContent.join('\n');
 }