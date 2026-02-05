 import { format } from 'date-fns';
 import { Users, Clock, Coffee, LogOut } from 'lucide-react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { useStaff } from '@/hooks/useStaff';
 import { useAttendance } from '@/hooks/useAttendance';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { ShiftWithStaff } from '@/types/schedule';
 import { Skeleton } from '@/components/ui/skeleton';
 import { cn } from '@/lib/utils';
 
 interface RosterStaff {
   id: string;
   name: string;
   profilePhoto: string | null;
   role: string;
   shiftType: 'morning' | 'evening' | null;
   status: 'not_arrived' | 'clocked_in' | 'on_break' | 'clocked_out';
 }
 
 export function TodayRoster() {
   const { staff, isLoading: staffLoading } = useStaff();
   const { attendance, isLoading: attendanceLoading } = useAttendance();
 
   // Fetch today's shifts directly
   const today = new Date();
   const todayStr = format(today, 'yyyy-MM-dd');
 
   const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
     queryKey: ['shifts-today', todayStr],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('shifts')
         .select(`
           *,
           staff_profiles (
             id,
             name,
             hourly_rate,
             profile_photo_url,
             role
           )
         `)
         .eq('shift_date', todayStr);
 
       if (error) throw error;
       return data as ShiftWithStaff[];
     },
   });
 
 
   // Get today's scheduled staff with their attendance status
   const rosterStaff: RosterStaff[] = staff.map((s) => {
     const todayShift = shifts.find(
       (shift) => shift.staff_id === s.id && shift.shift_date === todayStr
     );
 
     const todayAttendance = attendance.find(
       (a) => a.staff_id === s.id
     );
 
     let status: RosterStaff['status'] = 'not_arrived';
     if (todayAttendance) {
       status = todayAttendance.status;
     }
 
     return {
       id: s.id,
       name: s.name,
       profilePhoto: s.profile_photo_url,
       role: s.role,
       shiftType: todayShift?.shift_type ?? null,
       status,
     };
   }).filter((s) => s.shiftType !== null); // Only show scheduled staff
 
   const isLoading = staffLoading || attendanceLoading || shiftsLoading;
 
   const getStatusBadge = (status: RosterStaff['status']) => {
     switch (status) {
       case 'clocked_in':
         return <Badge className="bg-success text-success-foreground">On Duty</Badge>;
       case 'on_break':
         return <Badge className="bg-warning text-warning-foreground">On Break</Badge>;
       case 'clocked_out':
         return <Badge variant="secondary">Finished</Badge>;
       default:
         return <Badge variant="outline">Expected</Badge>;
     }
   };
 
   const getStatusIcon = (status: RosterStaff['status']) => {
     switch (status) {
       case 'clocked_in':
         return <Clock className="h-4 w-4 text-success" />;
       case 'on_break':
         return <Coffee className="h-4 w-4 text-warning" />;
       case 'clocked_out':
         return <LogOut className="h-4 w-4 text-muted-foreground" />;
       default:
         return null;
     }
   };
 
   // Summary counts
   const onDuty = rosterStaff.filter((s) => s.status === 'clocked_in').length;
   const onBreak = rosterStaff.filter((s) => s.status === 'on_break').length;
   const expected = rosterStaff.filter((s) => s.status === 'not_arrived').length;
 
   if (isLoading) {
     return (
       <Card className="h-full">
         <CardHeader className="pb-3">
           <Skeleton className="h-6 w-32" />
         </CardHeader>
         <CardContent>
           <div className="space-y-3">
             {[1, 2, 3, 4].map((i) => (
               <div key={i} className="flex items-center gap-3">
                 <Skeleton className="h-10 w-10 rounded-full" />
                 <div className="flex-1">
                   <Skeleton className="h-4 w-24 mb-1" />
                   <Skeleton className="h-3 w-16" />
                 </div>
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card className="h-full flex flex-col">
       <CardHeader className="pb-3 border-b">
         <div className="flex items-center justify-between">
           <CardTitle className="flex items-center gap-2">
             <Users className="h-5 w-5 text-primary" />
             Today's Roster
           </CardTitle>
           <span className="text-sm text-muted-foreground">
             {format(today, 'EEE, MMM d')}
           </span>
         </div>
 
         {/* Summary stats */}
         <div className="flex gap-4 mt-3 text-sm">
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-success" />
             <span>{onDuty} on duty</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-warning" />
             <span>{onBreak} on break</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-muted-foreground" />
             <span>{expected} expected</span>
           </div>
         </div>
       </CardHeader>
 
       <CardContent className="flex-1 p-0">
         <ScrollArea className="h-[calc(100vh-280px)]">
           <div className="p-4 space-y-2">
             {rosterStaff.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                 <p>No staff scheduled for today</p>
               </div>
             ) : (
               rosterStaff.map((member) => (
                 <div
                   key={member.id}
                   className={cn(
                     "flex items-center gap-3 p-3 rounded-lg transition-colors",
                     member.status === 'clocked_in' && "bg-success/10",
                     member.status === 'on_break' && "bg-warning/10",
                     member.status === 'clocked_out' && "bg-muted/50",
                     member.status === 'not_arrived' && "bg-card hover:bg-accent"
                   )}
                 >
                   <Avatar className="h-12 w-12">
                     <AvatarImage src={member.profilePhoto ?? undefined} />
                     <AvatarFallback className="text-sm font-medium">
                       {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                     </AvatarFallback>
                   </Avatar>
 
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                       <p className="font-medium truncate">{member.name}</p>
                       {getStatusIcon(member.status)}
                     </div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <span className="capitalize">{member.role}</span>
                       <span>•</span>
                       <span className="capitalize">{member.shiftType}</span>
                     </div>
                   </div>
 
                   {getStatusBadge(member.status)}
                 </div>
               ))
             )}
           </div>
         </ScrollArea>
       </CardContent>
     </Card>
   );
 }