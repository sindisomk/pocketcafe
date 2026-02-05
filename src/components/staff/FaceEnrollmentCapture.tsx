 import { useState, useRef, useCallback, useEffect } from 'react';
 import { Camera, CameraOff, Loader2, RefreshCw, Check, X } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 interface FaceEnrollmentCaptureProps {
   onCapture: (imageBase64: string) => void;
   onCancel: () => void;
   isEnrolling: boolean;
 }
 
 export function FaceEnrollmentCapture({ 
   onCapture, 
   onCancel,
   isEnrolling 
 }: FaceEnrollmentCaptureProps) {
   const videoRef = useRef<HTMLVideoElement>(null);
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const [cameraActive, setCameraActive] = useState(false);
   const [cameraError, setCameraError] = useState<string | null>(null);
   const [capturedImage, setCapturedImage] = useState<string | null>(null);
   const streamRef = useRef<MediaStream | null>(null);
 
   const startCamera = useCallback(async () => {
     try {
       setCameraError(null);
       const stream = await navigator.mediaDevices.getUserMedia({
         video: { 
           facingMode: 'user',
           width: { ideal: 640 },
           height: { ideal: 480 }
         },
       });
 
       streamRef.current = stream;
       if (videoRef.current) {
         videoRef.current.srcObject = stream;
         setCameraActive(true);
       }
     } catch (error) {
       console.error('Camera error:', error);
       setCameraError('Unable to access camera. Please check permissions.');
       setCameraActive(false);
     }
   }, []);
 
   const stopCamera = useCallback(() => {
     if (streamRef.current) {
       streamRef.current.getTracks().forEach(track => track.stop());
       streamRef.current = null;
     }
     setCameraActive(false);
   }, []);
 
   useEffect(() => {
     startCamera();
     return () => stopCamera();
   }, [startCamera, stopCamera]);
 
   const capturePhoto = useCallback(() => {
     if (!videoRef.current || !canvasRef.current) return;
 
     const video = videoRef.current;
     const canvas = canvasRef.current;
     const ctx = canvas.getContext('2d');
     
     if (!ctx) return;
 
     canvas.width = video.videoWidth;
     canvas.height = video.videoHeight;
     ctx.drawImage(video, 0, 0);
     
     const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
     setCapturedImage(dataUrl);
     stopCamera();
   }, [stopCamera]);
 
   const retakePhoto = useCallback(() => {
     setCapturedImage(null);
     startCamera();
   }, [startCamera]);
 
   const confirmCapture = useCallback(() => {
     if (!capturedImage) return;
     // Remove data URL prefix to get just the base64
     const base64 = capturedImage.split(',')[1];
     onCapture(base64);
   }, [capturedImage, onCapture]);
 
   return (
     <div className="space-y-4">
       {/* Camera/Preview area */}
       <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden">
         {cameraError ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4 p-4">
             <CameraOff className="h-12 w-12" />
             <p className="text-center text-sm">{cameraError}</p>
             <Button variant="outline" size="sm" onClick={startCamera}>
               <RefreshCw className="h-4 w-4 mr-2" />
               Retry
             </Button>
           </div>
         ) : capturedImage ? (
           <img 
             src={capturedImage} 
             alt="Captured face" 
             className="w-full h-full object-cover"
           />
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
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
             )}
 
             {/* Face guide overlay */}
             {cameraActive && (
               <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-white/50 rounded-[50%]" />
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-background/80 rounded-full">
                   <p className="text-xs font-medium">Position face in the oval</p>
                 </div>
               </div>
             )}
           </>
         )}
 
         {isEnrolling && (
           <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
             <div className="text-center">
               <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
               <p className="text-sm font-medium">Enrolling face...</p>
             </div>
           </div>
         )}
       </div>
 
       {/* Hidden canvas for capture */}
       <canvas ref={canvasRef} className="hidden" />
 
       {/* Action buttons */}
       <div className="flex gap-2">
         {!capturedImage ? (
           <>
             <Button
               variant="outline"
               className="flex-1"
               onClick={onCancel}
               disabled={isEnrolling}
             >
               <X className="h-4 w-4 mr-2" />
               Cancel
             </Button>
             <Button
               className="flex-1"
               onClick={capturePhoto}
               disabled={!cameraActive || isEnrolling}
             >
               <Camera className="h-4 w-4 mr-2" />
               Capture Photo
             </Button>
           </>
         ) : (
           <>
             <Button
               variant="outline"
               className="flex-1"
               onClick={retakePhoto}
               disabled={isEnrolling}
             >
               <RefreshCw className="h-4 w-4 mr-2" />
               Retake
             </Button>
             <Button
               className="flex-1"
               onClick={confirmCapture}
               disabled={isEnrolling}
             >
               <Check className="h-4 w-4 mr-2" />
               Enroll Face
             </Button>
           </>
         )}
       </div>
     </div>
   );
 }