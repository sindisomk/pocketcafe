 import { useState } from 'react';
 import { Search, User } from 'lucide-react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { ScrollArea } from '@/components/ui/scroll-area';
import { useKioskStaff } from '@/hooks/useKioskStaff';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface StaffSelectModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onStaffSelected: (staff: { id: string; name: string; photo: string | null }) => void;
 }
 
 export function StaffSelectModal({ open, onOpenChange, onStaffSelected }: StaffSelectModalProps) {
  const { staff, isLoading } = useKioskStaff();
   const [search, setSearch] = useState('');
 
   const filteredStaff = staff.filter((s) =>
     s.name.toLowerCase().includes(search.toLowerCase())
   );
 
   const handleSelect = (s: typeof staff[0]) => {
     onStaffSelected({
       id: s.id,
       name: s.name,
       photo: s.profile_photo_url,
     });
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>Select Staff Member</DialogTitle>
           <DialogDescription>
             Choose the staff member to clock in/out manually
           </DialogDescription>
         </DialogHeader>
 
         {/* Search */}
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Search staff..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="pl-10"
           />
         </div>
 
         {/* Staff list */}
         <ScrollArea className="h-[300px] -mx-6">
           <div className="px-6 space-y-1">
             {isLoading ? (
               <>
                 {[1, 2, 3, 4].map((i) => (
                   <div key={i} className="flex items-center gap-3 p-3">
                     <Skeleton className="h-10 w-10 rounded-full" />
                     <div className="flex-1">
                       <Skeleton className="h-4 w-24 mb-1" />
                       <Skeleton className="h-3 w-16" />
                     </div>
                   </div>
                 ))}
               </>
             ) : filteredStaff.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                 <p>No staff found</p>
               </div>
             ) : (
               filteredStaff.map((s) => (
                 <button
                   key={s.id}
                   className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                   onClick={() => handleSelect(s)}
                 >
                   <Avatar className="h-10 w-10">
                     <AvatarImage src={s.profile_photo_url ?? undefined} />
                     <AvatarFallback>
                       {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                     </AvatarFallback>
                   </Avatar>
                   <div>
                     <p className="font-medium">{s.name}</p>
                     <p className="text-sm text-muted-foreground capitalize">{s.role}</p>
                   </div>
                 </button>
               ))
             )}
           </div>
         </ScrollArea>
       </DialogContent>
     </Dialog>
   );
 }