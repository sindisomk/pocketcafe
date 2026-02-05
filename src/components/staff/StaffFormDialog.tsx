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
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Switch } from '@/components/ui/switch';
 import { Loader2 } from 'lucide-react';
 import { StaffProfile, StaffRole, ContractType } from '@/types/staff';
 import { useStaff } from '@/hooks/useStaff';
 
 // UK National Insurance Number format validation
 const niNumberRegex = /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i;
 
 const staffFormSchema = z.object({
   name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
   role: z.enum(['kitchen', 'floor', 'management'] as const),
   contract_type: z.enum(['salaried', 'zero_rate'] as const),
   hourly_rate: z.coerce.number().min(0, 'Hourly rate must be positive').max(500, 'Hourly rate seems too high'),
   ni_number: z
     .string()
     .transform((val) => val.replace(/\s/g, '').toUpperCase())
     .refine((val) => val === '' || niNumberRegex.test(val), {
       message: 'Invalid UK NI number format (e.g., AB123456C)',
     })
     .optional()
     .or(z.literal('')),
   profile_photo_url: z.string().url().optional().or(z.literal('')),
 });
 
 type StaffFormValues = z.infer<typeof staffFormSchema>;
 
 interface StaffFormDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   staff?: StaffProfile | null; // null = create mode, StaffProfile = edit mode
 }
 
 const roleOptions: { value: StaffRole; label: string }[] = [
   { value: 'kitchen', label: 'Kitchen' },
   { value: 'floor', label: 'Floor' },
   { value: 'management', label: 'Management' },
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
       role: 'floor',
       contract_type: 'zero_rate',
       hourly_rate: 11.44, // UK National Living Wage 2024 (21+)
       ni_number: '',
       profile_photo_url: '',
     },
   });
 
   // Reset form when dialog opens/closes or staff changes
   useEffect(() => {
     if (open) {
       if (staff) {
         form.reset({
           name: staff.name,
           role: staff.role,
           contract_type: staff.contract_type,
           hourly_rate: staff.hourly_rate,
           ni_number: staff.ni_number ?? '',
           profile_photo_url: staff.profile_photo_url ?? '',
         });
       } else {
         form.reset({
           name: '',
           role: 'floor',
           contract_type: 'zero_rate',
           hourly_rate: 11.44,
           ni_number: '',
           profile_photo_url: '',
         });
       }
     }
   }, [open, staff, form]);
 
   const onSubmit = async (values: StaffFormValues) => {
     setIsSubmitting(true);
     try {
       const payload = {
         name: values.name,
         role: values.role,
         contract_type: values.contract_type,
         hourly_rate: values.hourly_rate,
         ni_number: values.ni_number || null,
         profile_photo_url: values.profile_photo_url || null,
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
               <h3 className="text-sm font-medium text-muted-foreground">Personal Information</h3>
               
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
 
               <FormField
                 control={form.control}
                 name="profile_photo_url"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Profile Photo URL</FormLabel>
                     <FormControl>
                       <Input 
                         placeholder="https://example.com/photo.jpg" 
                         type="url"
                         {...field} 
                       />
                     </FormControl>
                     <FormDescription>
                       Optional: URL to employee profile photo
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             {/* Employment Details */}
             <div className="space-y-4">
               <h3 className="text-sm font-medium text-muted-foreground">Employment Details</h3>
 
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