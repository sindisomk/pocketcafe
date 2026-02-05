 import { useState, useEffect } from 'react';
 import { Coffee, KeyRound, Clock } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { CameraFeed } from '@/components/kiosk/CameraFeed';
 import { TodayRoster } from '@/components/kiosk/TodayRoster';
 import { ClockActionModal } from '@/components/kiosk/ClockActionModal';
 import { ManagerPinPad } from '@/components/kiosk/ManagerPinPad';
 import { StaffSelectModal } from '@/components/kiosk/StaffSelectModal';
 import { useAttendance } from '@/hooks/useAttendance';
 import { format } from 'date-fns';
 
 export default function Kiosk() {
   const [currentTime, setCurrentTime] = useState(new Date());
   const [showPinPad, setShowPinPad] = useState(false);
   const [showStaffSelect, setShowStaffSelect] = useState(false);
   const [selectedStaff, setSelectedStaff] = useState<{
     id: string;
     name: string;
     photo: string | null;
   } | null>(null);
   const [isProcessing, setIsProcessing] = useState(false);
 
   const { getActiveRecord, attendance } = useAttendance();
 
   // Update time every second
   useEffect(() => {
     const timer = setInterval(() => {
       setCurrentTime(new Date());
     }, 1000);
     return () => clearInterval(timer);
   }, []);
 
   // Handle Face++ detection (placeholder for actual Face++ integration)
   const handleFaceDetected = (staffId: string, confidence: number) => {
     // In production: fetch staff details and show action modal
     setIsProcessing(true);
     
     setTimeout(() => {
       setIsProcessing(false);
       // Would set selectedStaff from Face++ match
     }, 1000);
   };
 
   // Handle manager override success
   const handlePinVerified = () => {
     setShowStaffSelect(true);
   };
 
   // Handle manual staff selection (after PIN override)
   const handleStaffSelected = (staff: { id: string; name: string; photo: string | null }) => {
     setSelectedStaff(staff);
     setShowStaffSelect(false);
   };
 
   const activeRecord = selectedStaff 
     ? attendance.find(a => a.staff_id === selectedStaff.id && a.status !== 'clocked_out') ?? null
     : null;
 
   return (
     <div className="min-h-screen bg-sidebar text-sidebar-foreground">
       {/* Header */}
       <header className="fixed top-0 left-0 right-0 z-50 bg-sidebar-background border-b border-sidebar-border px-6 py-4">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-primary rounded-lg">
               <Coffee className="h-6 w-6 text-primary-foreground" />
             </div>
             <div>
               <h1 className="text-xl font-bold">PocketCafe</h1>
               <p className="text-sm text-sidebar-foreground/70">Kiosk Mode</p>
             </div>
           </div>
 
           <div className="flex items-center gap-6">
             {/* Current time */}
             <div className="text-right">
               <p className="text-3xl font-bold font-mono">
                 {format(currentTime, 'HH:mm:ss')}
               </p>
               <p className="text-sm text-sidebar-foreground/70">
                 {format(currentTime, 'EEEE, MMMM d, yyyy')}
               </p>
             </div>
 
             {/* Manager Override */}
             <Button
               variant="outline"
               size="lg"
               className="border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80"
               onClick={() => setShowPinPad(true)}
             >
               <KeyRound className="h-5 w-5 mr-2" />
               Manager Override
             </Button>
           </div>
         </div>
       </header>
 
       {/* Main content */}
       <main className="pt-24 h-screen flex">
         {/* Left panel - Camera (60%) */}
         <div className="w-[60%] p-6 pr-3">
           <div className="h-full rounded-2xl overflow-hidden border border-sidebar-border">
             <CameraFeed 
               onFaceDetected={handleFaceDetected}
               isProcessing={isProcessing}
             />
           </div>
         </div>
 
         {/* Right panel - Roster (40%) */}
         <div className="w-[40%] p-6 pl-3">
           <TodayRoster />
         </div>
       </main>
 
       {/* Modals */}
       <ManagerPinPad
         open={showPinPad}
         onOpenChange={setShowPinPad}
         onPinVerified={handlePinVerified}
       />
 
       <StaffSelectModal
         open={showStaffSelect}
         onOpenChange={setShowStaffSelect}
         onStaffSelected={handleStaffSelected}
       />
 
       {selectedStaff && (
         <ClockActionModal
           open={!!selectedStaff}
           onOpenChange={(open) => !open && setSelectedStaff(null)}
           staffId={selectedStaff.id}
           staffName={selectedStaff.name}
           staffPhoto={selectedStaff.photo}
           activeRecord={activeRecord as any}
         />
       )}
     </div>
   );
 }