 import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, Loader2, LogIn, LogOut, Coffee, Clock, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AttendanceRecord } from '@/types/attendance';

type ClockAction = 'clock_in' | 'start_break' | 'end_break' | 'clock_out';

// Get status badge info based on current attendance state
const getStatusBadge = (activeRecord?: AttendanceRecord | null) => {
  if (!activeRecord || activeRecord.status === 'clocked_out') {
    return { label: 'Not Clocked In', variant: 'secondary' as const, icon: LogIn };
  }
  if (activeRecord.status === 'on_break') {
    return { label: 'On Break', variant: 'default' as const, icon: Coffee };
  }
  if (activeRecord.status === 'clocked_in') {
    return { label: 'Working', variant: 'default' as const, icon: Clock };
  }
  return { label: 'Unknown', variant: 'secondary' as const, icon: Clock };
};
 
 interface CameraFeedProps {
   onFaceDetected: (staffId: string, confidence: number) => void;
   isProcessing: boolean;
   staffName?: string | null;
  detectedStaffId?: string | null;
  detectedConfidence?: number | null;
  activeRecord?: AttendanceRecord | null;
  onQuickAction?: (action: ClockAction, staffId: string, confidence: number) => void;
 }
 
function CameraFeedContent({ 
  onFaceDetected, 
  isProcessing, 
  staffName,
  detectedStaffId,
  detectedConfidence,
  activeRecord,
  onQuickAction,
}: CameraFeedProps) {
   const videoRef = useRef<HTMLVideoElement>(null);
   const lastSearchRef = useRef<number>(0);
   const searchCooldownRef = useRef<boolean>(false);
   const matchCooldownRef = useRef<boolean>(false);
   const [cameraActive, setCameraActive] = useState(false);
   const [cameraError, setCameraError] = useState<string | null>(null);
   const [scanningStatus, setScanningStatus] = useState<'idle' | 'scanning' | 'detected'>('idle');
   const [statusMessage, setStatusMessage] = useState('Position your face in the frame');
  const [lastDetectedConfidence, setLastDetectedConfidence] = useState<number | null>(null);
 
   useEffect(() => {
     let stream: MediaStream | null = null;
 
     const startCamera = async () => {
       try {
         stream = await navigator.mediaDevices.getUserMedia({
           video: { 
             facingMode: 'user',
             width: { ideal: 1280 },
             height: { ideal: 720 }
           },
         });
 
         if (videoRef.current) {
           videoRef.current.srcObject = stream;
           setCameraActive(true);
           setCameraError(null);
         }
       } catch (error) {
         console.error('Camera error:', error);
         setCameraError('Unable to access camera. Please check permissions.');
         setCameraActive(false);
       }
     };
 
     startCamera();
 
     return () => {
       if (stream) {
         stream.getTracks().forEach(track => track.stop());
       }
     };
   }, []);
 
   // Capture frame and search for face
   const captureAndSearch = useCallback(async () => {
     if (!videoRef.current || !cameraActive || isProcessing) return;
     if (searchCooldownRef.current || matchCooldownRef.current) return;
     
     const now = Date.now();
     if (now - lastSearchRef.current < 2500) return;
     
     lastSearchRef.current = now;
     searchCooldownRef.current = true;
     setScanningStatus('scanning');
     setStatusMessage('Scanning...');
 
     try {
       const video = videoRef.current;
       const canvas = document.createElement('canvas');
       canvas.width = video.videoWidth;
       canvas.height = video.videoHeight;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;
       
       ctx.drawImage(video, 0, 0);
       const imageBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
 
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/face-search`,
         {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ imageBase64 }),
         }
       );
 
       const data = await response.json();
 
       if (data.matched && data.staffId && data.confidence) {
         setScanningStatus('detected');
         setStatusMessage(`Welcome, ${data.staffName}!`);
          setLastDetectedConfidence(data.confidence);
          
          // Set match cooldown to prevent re-detection - extended to 8 seconds
          // Parent controls when to clear detection state via detectedStaffId prop
          matchCooldownRef.current = true;
          setTimeout(() => {
            matchCooldownRef.current = false;
            // Only reset UI if parent has cleared the detection
            // This prevents overlay from disappearing while user is deciding
          }, 8000);

          onFaceDetected(data.staffId, data.confidence);
       } else {
         setScanningStatus('idle');
         if (data.error === 'No enrolled faces yet') {
           setStatusMessage('No staff enrolled yet');
         } else {
           setStatusMessage('Face not recognized');
           setTimeout(() => setStatusMessage('Position your face in the frame'), 2000);
         }
       }
     } catch (error) {
       console.error('[CameraFeed] Search error:', error);
       setScanningStatus('idle');
       setStatusMessage('Position your face in the frame');
     } finally {
       searchCooldownRef.current = false;
     }
   }, [cameraActive, isProcessing, onFaceDetected]);
 
   // Auto-search interval
   useEffect(() => {
     if (!cameraActive || isProcessing) return;
 
     const interval = setInterval(() => {
       captureAndSearch();
     }, 3000);
 
      return () => clearInterval(interval);
    }, [cameraActive, isProcessing, captureAndSearch]);

    // Sync scanning status with parent's detection state
    // When parent clears detectedStaffId, reset CameraFeed's internal state
    useEffect(() => {
      if (!detectedStaffId) {
        setScanningStatus('idle');
        setStatusMessage('Position your face in the frame');
        setLastDetectedConfidence(null);
      }
    }, [detectedStaffId]);
 
  // Manual scan trigger - bypasses cooldowns
  const handleManualScan = () => {
    if (isProcessing || scanningStatus === 'scanning') return;
    searchCooldownRef.current = false;
    lastSearchRef.current = 0;
    captureAndSearch();
  };

  // Quick action handlers
  const handleQuickAction = (action: ClockAction) => {
    if (detectedStaffId && onQuickAction) {
      const confidence = detectedConfidence ?? lastDetectedConfidence ?? 0;
      onQuickAction(action, detectedStaffId, confidence);
    }
  };

  // Determine available actions based on current status
  const canClockIn = !activeRecord || activeRecord.status === 'clocked_out';
  const canStartBreak = activeRecord?.status === 'clocked_in' && !activeRecord.break_start_time;
  const canEndBreak = activeRecord?.status === 'on_break';
  const canClockOut = activeRecord && activeRecord.status !== 'clocked_out';

  // Get status info for display
  const statusBadge = getStatusBadge(activeRecord);

   return (
     <div className="relative w-full h-full min-h-[400px] bg-sidebar rounded-lg overflow-hidden">
       {cameraError ? (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4">
           <CameraOff className="h-16 w-16" />
           <p className="text-center px-4">{cameraError}</p>
           <Button 
             variant="outline" 
             onClick={() => window.location.reload()}
           >
             Retry Camera
           </Button>
         </div>
       ) : (
         <>
           <video
             ref={videoRef}
             autoPlay
             playsInline
             muted
             className={cn(
               "w-full h-full object-cover",
               !cameraActive && "opacity-0"
             )}
           />
           
           {!cameraActive && (
             <div className="absolute inset-0 flex items-center justify-center">
               <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
           )}
 
           {/* Face detection overlay */}
           {cameraActive && (
             <div className="absolute inset-0 pointer-events-none">
               {/* Scanning frame */}
               <div className={cn(
                 "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                 "w-64 h-80 border-4 rounded-3xl transition-colors duration-300",
                 scanningStatus === 'idle' && "border-white/50",
                 scanningStatus === 'scanning' && "border-primary animate-pulse",
                 scanningStatus === 'detected' && "border-success"
               )}>
                 {/* Corner markers */}
                 <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                 <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                 <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                 <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
               </div>
 
                {/* Tap to Scan button - shown when idle and no face detected */}
                {scanningStatus === 'idle' && !detectedStaffId && (
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <Button
                      size="lg"
                      className="text-lg px-8 py-6 shadow-lg bg-primary hover:bg-primary/90"
                      onClick={handleManualScan}
                    >
                      <Scan className="h-6 w-6 mr-2" />
                      Tap to Scan
                    </Button>
                  </div>
                )}

                {/* Scanning indicator */}
                {scanningStatus === 'scanning' && (
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <div className="bg-background/90 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="font-medium text-foreground">Scanning...</span>
                    </div>
                  </div>
                )}

                {/* Status text - only shown when idle */}
                {scanningStatus === 'idle' && !detectedStaffId && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 bg-background/90 rounded-full">
                    <p className="text-sm font-medium text-foreground">
                      {statusMessage}
                    </p>
                  </div>
                )}

                {/* Redesigned action overlay when face detected */}
                {detectedStaffId && staffName && onQuickAction && (
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-5 shadow-2xl border border-border min-w-[320px]">
                      {/* Staff info header */}
                      <div className="text-center mb-4">
                        <p className="font-bold text-lg text-foreground">{staffName}</p>
                        {lastDetectedConfidence && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Match: {Math.round(lastDetectedConfidence)}% confident
                          </p>
                        )}
                      </div>

                      {/* Current status badge */}
                      <div className="flex justify-center mb-4">
                        <Badge 
                          variant={statusBadge.variant}
                          className={cn(
                            "px-4 py-1.5 text-sm",
                            statusBadge.label === 'Working' && "bg-success text-success-foreground",
                            statusBadge.label === 'On Break' && "bg-warning text-warning-foreground"
                          )}
                        >
                          <statusBadge.icon className="h-4 w-4 mr-2" />
                          Currently: {statusBadge.label}
                        </Badge>
                      </div>

                      {/* Action buttons - contextual based on status */}
                      <div className="space-y-2">
                        {/* Not clocked in - show primary Clock In button */}
                        {canClockIn && (
                          <Button
                            size="lg"
                            className="w-full bg-success hover:bg-success/90 text-success-foreground text-base py-6"
                            onClick={() => handleQuickAction('clock_in')}
                          >
                            <LogIn className="h-5 w-5 mr-2" />
                            Clock In
                          </Button>
                        )}

                        {/* Clocked in - show Break and Clock Out options */}
                        {canStartBreak && (
                          <div className="flex gap-2">
                            <Button
                              size="lg"
                              className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground"
                              onClick={() => handleQuickAction('start_break')}
                            >
                              <Coffee className="h-5 w-5 mr-2" />
                              Start Break
                            </Button>
                            <Button
                              size="lg"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => handleQuickAction('clock_out')}
                            >
                              <LogOut className="h-5 w-5 mr-2" />
                              Clock Out
                            </Button>
                          </div>
                        )}

                        {/* On break - show End Break as primary */}
                        {canEndBreak && (
                          <div className="space-y-2">
                            <Button
                              size="lg"
                              className="w-full bg-primary hover:bg-primary/90 text-base py-6"
                              onClick={() => handleQuickAction('end_break')}
                            >
                              <Clock className="h-5 w-5 mr-2" />
                              End Break
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-muted-foreground"
                              onClick={() => handleQuickAction('clock_out')}
                            >
                              <LogOut className="h-4 w-4 mr-1" />
                              Clock Out Instead
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
 
           {isProcessing && (
             <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
               <div className="text-center">
                 <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                 <p className="text-lg font-medium">Processing...</p>
               </div>
             </div>
           )}
         </>
       )}
 
       {/* Camera indicator */}
       <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-background/80 rounded-full">
         <div className={cn(
           "w-2 h-2 rounded-full",
           cameraActive ? "bg-success animate-pulse" : "bg-destructive"
         )} />
         <span className="text-xs font-medium">
           {cameraActive ? 'Camera Active' : 'Camera Off'}
         </span>
       </div>
     </div>
   );
 }
 
 // Fallback component for Suspense
 function CameraFallback() {
   return (
     <div className="w-full h-full min-h-[400px] bg-sidebar rounded-lg flex items-center justify-center">
       <div className="text-center">
         <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
         <p className="text-muted-foreground">Initializing camera...</p>
       </div>
     </div>
   );
 }
 
 export function CameraFeed(props: CameraFeedProps) {
   return (
     <Suspense fallback={<CameraFallback />}>
       <CameraFeedContent {...props} />
     </Suspense>
   );
 }