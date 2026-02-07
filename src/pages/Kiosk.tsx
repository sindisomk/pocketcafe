import { useState, useEffect, useRef, useCallback } from 'react';
import { Coffee, KeyRound, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CameraFeed } from '@/components/kiosk/CameraFeed';
import { TodayRoster } from '@/components/kiosk/TodayRoster';
import { ClockActionModal } from '@/components/kiosk/ClockActionModal';
import { ManagerPinPad } from '@/components/kiosk/ManagerPinPad';
import { StaffSelectModal } from '@/components/kiosk/StaffSelectModal';
import { SleepOverlay } from '@/components/kiosk/SleepOverlay';
import { useAttendance } from '@/hooks/useAttendance';
import { useNoShowDetection } from '@/hooks/useNoShowDetection';
import { useWorkHoursSettings } from '@/hooks/useAppSettings';
import { AttendanceRecord } from '@/types/attendance';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { ShiftWithStaff } from '@/types/schedule';

// Sleep mode timeout: 5 minutes of inactivity
const SLEEP_TIMEOUT_MS = 5 * 60 * 1000;
 
export default function Kiosk() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPinPad, setShowPinPad] = useState(false);
  const [pinPadMode, setPinPadMode] = useState<'override' | 'exit'>('override');
  const [showStaffSelect, setShowStaffSelect] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{
    id: string;
    name: string;
    photo: string | null;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedStaffName, setDetectedStaffName] = useState<string | null>(null);
  const [detectedStaffId, setDetectedStaffId] = useState<string | null>(null);
  const [detectedConfidence, setDetectedConfidence] = useState<number | null>(null);
  const [managerOverrideId, setManagerOverrideId] = useState<string | null>(null);
  
  // Sleep mode state
  const [isSleeping, setIsSleeping] = useState(false);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const { getActiveRecord, attendance, clockIn, startBreak, endBreak, clockOut, refetch } = useAttendance();
  const { settings } = useWorkHoursSettings();
  
  // Enable no-show detection in the background
  useNoShowDetection({ 
    enabled: !isSleeping, // Disable during sleep to reduce queries
    thresholdMinutes: settings.noShowThresholdMinutes 
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's shifts for lateness calculation
  const { data: shifts = [] } = useQuery({
    queryKey: queryKeys.shiftsToday(today),
    enabled: !isSleeping, // Disable during sleep
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
        .eq('shift_date', today);

      if (error) throw error;
      return data as ShiftWithStaff[];
    },
  });

  // Sleep mode: reset timer on any interaction
  const resetSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
    }
    setIsSleeping(false);
    sleepTimerRef.current = setTimeout(() => {
      setIsSleeping(true);
    }, SLEEP_TIMEOUT_MS);
  }, []);

  // Set up sleep timer and event listeners
  useEffect(() => {
    const events = ['mousedown', 'touchstart', 'keydown', 'mousemove'];
    
    events.forEach(event => document.addEventListener(event, resetSleepTimer));
    
    // Start initial timer
    resetSleepTimer();
    
    return () => {
      events.forEach(event => document.removeEventListener(event, resetSleepTimer));
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, [resetSleepTimer]);
 
   // Update time every second
   useEffect(() => {
     const timer = setInterval(() => {
       setCurrentTime(new Date());
     }, 1000);
     return () => clearInterval(timer);
   }, []);
 
  // Handle Face++ detection - store staffId and confidence for overlay
  // IMPORTANT: Set state IMMEDIATELY before async fetch to avoid race condition
  const handleFaceDetected = async (staffId: string, confidence: number) => {
    // Set detection state IMMEDIATELY before async operation
    setDetectedStaffId(staffId);
    setDetectedConfidence(confidence);
    setIsProcessing(true);
     
    try {
      // Fetch staff details from manager view (secure, excludes sensitive fields)
      const { data, error } = await supabase
        .from('staff_profiles_manager')
        .select('id, name, profile_photo_url')
        .eq('id', staffId)
        .single();
      
      if (!error && data) {
        setDetectedStaffName(data.name);
      }
    } finally {
      setIsProcessing(false);
    }
  };
 
   // Handle manager override success
  const handlePinVerified = (managerId: string) => {
    if (pinPadMode === 'exit') {
      setShowPinPad(false);
      navigate('/');
    } else {
      setManagerOverrideId(managerId);
      setShowStaffSelect(true);
    }
  };

  const handleManagerOverride = () => {
    setPinPadMode('override');
    setShowPinPad(true);
  };

  const handleExitKiosk = () => {
    setPinPadMode('exit');
    setShowPinPad(true);
   };
 
   // Handle manual staff selection (after PIN override)
   const handleStaffSelected = (staff: { id: string; name: string; photo: string | null }) => {
     setSelectedStaff(staff);
     setShowStaffSelect(false);
    setDetectedStaffId(staff.id);
    setDetectedConfidence(null); // No face confidence for manual selection
   };
 
  // Get active record for selected or detected staff
  const currentStaffId = selectedStaff?.id ?? detectedStaffId;
  const activeRecord: AttendanceRecord | null = currentStaffId 
    ? (attendance.find(a => a.staff_id === currentStaffId && a.status !== 'clocked_out') as AttendanceRecord | undefined) ?? null
     : null;

  // Handle quick clock action from camera overlay
  const handleQuickAction = async (
    action: 'clock_in' | 'start_break' | 'end_break' | 'clock_out',
    staffId: string,
    confidence: number
  ) => {
    try {
      switch (action) {
        case 'clock_in':
          // Find the staff's shift for today to get scheduled start time
          const todayShift = shifts.find(s => s.staff_id === staffId);
          
          await clockIn.mutateAsync({
            staffId,
            faceConfidence: confidence,
            scheduledStartTime: todayShift?.start_time,
            shiftDate: today,
            graceMinutes: settings.latenessGraceMinutes,
          });
          break;
        case 'start_break':
          const recordForBreak = attendance.find(a => a.staff_id === staffId && a.status !== 'clocked_out');
          if (recordForBreak) {
            await startBreak.mutateAsync(recordForBreak.id);
          }
          break;
        case 'end_break':
          const recordForEndBreak = attendance.find(a => a.staff_id === staffId && a.status === 'on_break');
          if (recordForEndBreak) {
            await endBreak.mutateAsync(recordForEndBreak.id);
          }
          break;
        case 'clock_out':
          const recordForClockOut = attendance.find(a => a.staff_id === staffId && a.status !== 'clocked_out');
          if (recordForClockOut) {
            await clockOut.mutateAsync(recordForClockOut.id);
          }
          break;
      }
      
      // Give the mutation time to propagate to the database
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force refetch attendance data to update both Kiosk and TodayRoster
      await refetch();
      
      // Clear detection state after successful action
      setDetectedStaffId(null);
      setDetectedConfidence(null);
      setDetectedStaffName(null);
      
    } catch (error) {
      console.error('[Kiosk] Quick action failed:', error);
      toast.error('Action failed. Please try again.');
    }
  };

  // Clear manager override after modal closes
  const handleModalClose = () => {
    setSelectedStaff(null);
    setManagerOverrideId(null);
  };
 
   return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground">
      {/* Sleep mode overlay */}
      {isSleeping && <SleepOverlay onWake={resetSleepTimer} />}
      
      {/* Header */}
       <header className="fixed top-0 left-0 right-0 z-50 bg-sidebar-background border-b border-sidebar-border px-3 py-2 md:px-6 md:py-4">
         <div className="flex items-center justify-between gap-2">
           <div className="flex items-center gap-2 md:gap-3 min-w-0">
             <div className="p-1.5 md:p-2 bg-primary rounded-lg shrink-0">
               <Coffee className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
             </div>
             <div className="hidden sm:block">
               <h1 className="text-lg md:text-xl font-bold">PocketCafe</h1>
               <p className="text-xs md:text-sm text-sidebar-foreground/70">Kiosk Mode</p>
             </div>
           </div>
 
           <div className="flex items-center gap-2 md:gap-6">
             {/* Current time */}
             <div className="text-right">
               <p className="text-lg md:text-3xl font-bold font-mono">
                 {format(currentTime, 'HH:mm:ss')}
               </p>
               <p className="hidden sm:block text-xs md:text-sm text-sidebar-foreground/70">
                 {format(currentTime, 'EEEE, MMMM d, yyyy')}
               </p>
             </div>
 
             {/* Manager Override */}
             <Button
               variant="outline"
               size="sm"
               className="border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80 md:size-lg"
                onClick={handleManagerOverride}
             >
               <KeyRound className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
               <span className="hidden md:inline">Manager Override</span>
             </Button>

              {/* Exit Kiosk */}
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 md:h-10 md:w-10"
                onClick={handleExitKiosk}
                title="Exit Kiosk (requires PIN)"
              >
                <LogOut className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
           </div>
         </div>
       </header>
 
        {/* Main content - stacks vertically on mobile */}
        <main className="pt-16 md:pt-24 min-h-screen flex flex-col md:flex-row">
          {/* Camera panel - full width on mobile, 60% on desktop */}
          <div className="w-full md:w-[60%] p-3 md:p-6 md:pr-3 h-[50vh] md:h-auto">
            <div className="h-full rounded-2xl overflow-hidden border border-sidebar-border">
              {!isSleeping && (
                <CameraFeed 
                  onFaceDetected={handleFaceDetected}
                  isProcessing={isProcessing}
                  staffName={detectedStaffName}
                  detectedStaffId={detectedStaffId}
                  detectedConfidence={detectedConfidence}
                  activeRecord={activeRecord}
                  onQuickAction={handleQuickAction}
                />
              )}
              {isSleeping && (
                <div className="w-full h-full flex items-center justify-center bg-sidebar">
                  <p className="text-sidebar-foreground/50">Camera paused</p>
                </div>
              )}
            </div>
          </div>

          {/* Roster panel - full width on mobile, 40% on desktop */}
          <div className="w-full md:w-[40%] p-3 md:p-6 md:pl-3 flex-1 md:flex-none">
            <TodayRoster />
          </div>
        </main>
 
       {/* Modals */}
       <ManagerPinPad
         open={showPinPad}
         onOpenChange={setShowPinPad}
         onPinVerified={handlePinVerified}
          title={pinPadMode === 'exit' ? 'Exit Kiosk' : 'Manager Override'}
          description={pinPadMode === 'exit' ? 'Enter your manager PIN to exit kiosk mode' : 'Enter your manager PIN to override'}
       />
 
       <StaffSelectModal
         open={showStaffSelect}
         onOpenChange={setShowStaffSelect}
         onStaffSelected={handleStaffSelected}
       />
 
       {selectedStaff && (
         <ClockActionModal
           open={!!selectedStaff}
           onOpenChange={(open) => !open && handleModalClose()}
           staffId={selectedStaff.id}
           staffName={selectedStaff.name}
           staffPhoto={selectedStaff.photo}
           activeRecord={activeRecord}
           faceConfidence={detectedConfidence ?? undefined}
           overrideManagerId={managerOverrideId ?? undefined}
           isManagerOverride={!!managerOverrideId}
           onActionComplete={handleModalClose}
           scheduledStartTime={shifts.find(s => s.staff_id === selectedStaff.id)?.start_time}
           shiftDate={today}
           graceMinutes={settings.latenessGraceMinutes}
         />
       )}
     </div>
   );
 }