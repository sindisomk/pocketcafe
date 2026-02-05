 import { useState, useEffect } from 'react';
 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { z } from 'zod';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
   DialogFooter,
 } from '@/components/ui/dialog';
 import {
   Form,
   FormControl,
   FormDescription,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
 } from '@/components/ui/form';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import {
   Select,
   SelectContent,
  SelectGroup,
   SelectItem,
  SelectLabel,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
 import { Loader2 } from 'lucide-react';
import { StaffProfile, StaffRole, ContractType, JobTitle, JOB_TITLES, DEPARTMENT_LABELS } from '@/types/staff';
 import { useStaff } from '@/hooks/useStaff';
 
 // UK National Insurance Number format validation
 const niNumberRegex = /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i;
 
 // UK phone number validation (basic) - allows optional
 const ukPhoneRegex = /^(\+44|0)[1-9]\d{8,9}$/;
 
 // Common UK tax codes
 const UK_TAX_CODES = ['1257L', '1257L-W1', '1257L-M1', 'BR', 'D0', 'D1', '0T', 'NT', 'S1257L', 'C1257L'];
 
 // NIC Categories
 const NIC_CATEGORIES = [
   { value: 'A', label: 'A - Standard rate (most employees)' },
   { value: 'B', label: 'B - Married women reduced rate' },
   { value: 'C', label: 'C - Over State Pension age' },
   { value: 'F', label: 'F - Freeport standard rate' },
   { value: 'H', label: 'H - Apprentice under 25' },
   { value: 'J', label: 'J - Deferment (multiple jobs)' },
   { value: 'M', label: 'M - Under 21' },
   { value: 'V', label: 'V - Veteran first year' },
   { value: 'Z', label: 'Z - Under 21 deferment' },
 ];

 const staffFormSchema = z.object({
   name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  contact_email: z.string().max(255).default(''),
  contact_phone: z
    .string()
    .max(20)
    .default(''),
  role: z.enum(['kitchen', 'floor', 'management', 'bar'] as const),
  job_title: z.enum([
    'server', 'host', 'bartender', 'barback', 'busser', 'food_runner',
    'head_chef', 'sous_chef', 'line_cook', 'prep_cook', 'dishwasher', 'kitchen_porter',
    'bar_manager', 'mixologist',
    'general_manager', 'assistant_manager', 'shift_supervisor', 'floor_manager'
  ] as const).optional().or(z.literal('')),
  start_date: z.date().optional(),
   contract_type: z.enum(['salaried', 'zero_rate'] as const),
   hourly_rate: z.coerce.number().min(0, 'Hourly rate must be positive').max(500, 'Hourly rate seems too high'),
  ni_number: z
     .string()
     .transform((val) => val.replace(/\s/g, '').toUpperCase())
     .refine((val) => val === '' || niNumberRegex.test(val), {
       message: 'Invalid UK NI number format (e.g., AB123456C)',
     })
    .default(''),
  tax_code: z.string().max(20).default('1257L'),
  nic_category: z.string().max(1).default('A'),
 });
 
 type StaffFormValues = z.infer<typeof staffFormSchema>;
 
 interface StaffFormDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   staff?: StaffProfile | null; // null = create mode, StaffProfile = edit mode
 }
 
 const roleOptions: { value: StaffRole; label: string }[] = [
  { value: 'floor', label: DEPARTMENT_LABELS.floor },
  { value: 'kitchen', label: DEPARTMENT_LABELS.kitchen },
  { value: 'bar', label: DEPARTMENT_LABELS.bar },
  { value: 'management', label: DEPARTMENT_LABELS.management },
 ];
 
 const contractOptions: { value: ContractType; label: string; description: string }[] = [
   { value: 'zero_rate', label: 'Zero-Rate', description: 'Paid per hour (12.07% holiday accrual)' },
   { value: 'salaried', label: 'Salaried', description: 'Fixed monthly salary' },
 ];
 
 export function StaffFormDialog({ open, onOpenChange, staff }: StaffFormDialogProps) {
   const { createStaff, updateStaff } = useStaff();
   const [isSubmitting, setIsSubmitting] = useState(false);
   const isEditMode = !!staff;
 
   const form = useForm<StaffFormValues>({
     resolver: zodResolver(staffFormSchema),
     defaultValues: {
       name: '',
      contact_email: '',
      contact_phone: '',
       role: 'floor',
      job_title: '',
      start_date: undefined,
       contract_type: 'zero_rate',
       hourly_rate: 11.44, // UK National Living Wage 2024 (21+)
       ni_number: '',
        tax_code: '1257L',
        nic_category: 'A',
     },
   });
 
  const selectedRole = form.watch('role');

  // Filter job titles based on selected department
  const filteredJobTitles = JOB_TITLES.filter((jt) => jt.department === selectedRole);

   // Reset form when dialog opens/closes or staff changes
   useEffect(() => {
     if (open) {
       // Radix Dialog sets pointer-events: none on body which blocks
       // external overlays (like DuckDuckGo Email Protection) from working.
       // This workaround clears that style after Radix applies it.
       const pointerEventsTimer = setTimeout(() => {
         document.body.style.pointerEvents = '';
       }, 0);
 
       if (staff) {
         form.reset({
           name: staff.name,
          contact_email: staff.contact_email ?? '',
          contact_phone: staff.contact_phone ?? '',
           role: staff.role,
          job_title: (staff.job_title as JobTitle) ?? '',
          start_date: staff.start_date ? new Date(staff.start_date) : undefined,
           contract_type: staff.contract_type,
           hourly_rate: staff.hourly_rate,
           ni_number: staff.ni_number ?? '',
            tax_code: staff.tax_code ?? '1257L',
            nic_category: staff.nic_category ?? 'A',
         });
       } else {
         form.reset({
           name: '',
          contact_email: '',
          contact_phone: '',
           role: 'floor',
          job_title: '',
          start_date: undefined,
           contract_type: 'zero_rate',
           hourly_rate: 11.44,
           ni_number: '',
            tax_code: '1257L',
            nic_category: 'A',
         });
       }
       return () => clearTimeout(pointerEventsTimer);
     }
   }, [open, staff, form]);
 
   const onSubmit = async (values: StaffFormValues) => {
     setIsSubmitting(true);
     try {
       const payload = {
         name: values.name,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
         role: values.role,
        job_title: (values.job_title as JobTitle) || null,
        start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : null,
         contract_type: values.contract_type,
         hourly_rate: values.hourly_rate,
         ni_number: values.ni_number || null,
        tax_code: values.tax_code || null,
        nic_category: values.nic_category || null,
        profile_photo_url: null,
         user_id: staff?.user_id ?? null,
       };
 
       if (isEditMode && staff) {
         await updateStaff.mutateAsync({ id: staff.id, ...payload });
       } else {
         await createStaff.mutateAsync(payload);
       }
 
       onOpenChange(false);
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>{isEditMode ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
           <DialogDescription>
             {isEditMode
               ? 'Update employee details. Changes will take effect immediately.'
               : 'Enter the employee details below. All fields marked with * are required.'}
           </DialogDescription>
         </DialogHeader>
 
         <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {/* Personal Information */}
             <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Personal & Contact Information</h3>
               
               <FormField
                 control={form.control}
                 name="name"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Full Name *</FormLabel>
                     <FormControl>
                       <Input placeholder="John Smith" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
 
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          inputMode="email"
                          autoComplete="off"
                          placeholder="john@example.com" 
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="07700 900123" 
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                 control={form.control}
                 name="ni_number"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>National Insurance Number</FormLabel>
                     <FormControl>
                       <Input 
                         placeholder="AB 12 34 56 C" 
                         {...field} 
                         className="uppercase font-mono"
                       />
                     </FormControl>
                     <FormDescription>
                       Required for payroll. Format: 2 letters, 6 digits, 1 letter
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>

              {/* Tax & NIC Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Tax & National Insurance</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="tax_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Code (PAYE)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || '1257L'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tax code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UK_TAX_CODES.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          HMRC tax code for PAYE deductions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nic_category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIC Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'A'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select NIC category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {NIC_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          NI contributions above £737/month
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
 
             {/* Employment Details */}
             <div className="space-y-4">
               <h3 className="text-sm font-medium text-muted-foreground">Employment Details</h3>
 
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1990-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Employee's first day of work
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                 control={form.control}
                 name="role"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Department *</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select department" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {roleOptions.map((option) => (
                           <SelectItem key={option.value} value={option.value}>
                             {option.label}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
 
              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title / Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job title" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>{DEPARTMENT_LABELS[selectedRole]}</SelectLabel>
                          {filteredJobTitles.map((jt) => (
                            <SelectItem key={jt.value} value={jt.value}>
                              {jt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Specific role within the department
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                 control={form.control}
                 name="contract_type"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Contract Type *</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select contract type" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {contractOptions.map((option) => (
                           <SelectItem key={option.value} value={option.value}>
                             <div className="flex flex-col">
                               <span>{option.label}</span>
                               <span className="text-xs text-muted-foreground">{option.description}</span>
                             </div>
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <FormDescription>
                       Zero-rate: 12.07% holiday accrual per UK law
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />
 
               <FormField
                 control={form.control}
                 name="hourly_rate"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Hourly Rate (£) *</FormLabel>
                     <FormControl>
                       <Input 
                         type="number" 
                         step="0.01" 
                         min="0"
                         placeholder="11.44"
                         {...field}
                       />
                     </FormControl>
                     <FormDescription>
                       UK National Living Wage (21+): £11.44/hr (Apr 2024)
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             <DialogFooter className="gap-2 sm:gap-0">
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => onOpenChange(false)}
                 disabled={isSubmitting}
               >
                 Cancel
               </Button>
               <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isEditMode ? 'Save Changes' : 'Add Staff Member'}
               </Button>
             </DialogFooter>
           </form>
         </Form>
       </DialogContent>
     </Dialog>
   );
 }