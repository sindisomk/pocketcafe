 import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
 import { Camera, CameraOff, Loader2, User } from 'lucide-react';
 import { Card, CardContent } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 interface CameraFeedProps {
   onFaceDetected: (staffId: string, confidence: number) => void;
   isProcessing: boolean;
   staffName?: string | null;
 }
 
 function CameraFeedContent({ onFaceDetected, isProcessing, staffName }: CameraFeedProps) {
   const videoRef = useRef<HTMLVideoElement>(null);
   const lastSearchRef = useRef<number>(0);
   const searchCooldownRef = useRef<boolean>(false);
   const matchCooldownRef = useRef<boolean>(false);
   const [cameraActive, setCameraActive] = useState(false);
   const [cameraError, setCameraError] = useState<string | null>(null);
   const [scanningStatus, setScanningStatus] = useState<'idle' | 'scanning' | 'detected'>('idle');
   const [statusMessage, setStatusMessage] = useState('Position your face in the frame');
 
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
         
         // Set match cooldown to prevent re-detection for 5 seconds
         matchCooldownRef.current = true;
         setTimeout(() => {
           matchCooldownRef.current = false;
           setScanningStatus('idle');
           setStatusMessage('Position your face in the frame');
         }, 5000);
 
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
 
               {/* Status text */}
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 bg-background/90 rounded-full">
                 <p className="text-sm font-medium text-foreground">
                   {statusMessage}
                 </p>
               </div>
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