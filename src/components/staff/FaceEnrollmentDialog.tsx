 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from '@/components/ui/dialog';
 import { FaceEnrollmentCapture } from './FaceEnrollmentCapture';
 import { useFaceEnrollment } from '@/hooks/useFaceEnrollment';
 import { useQueryClient } from '@tanstack/react-query';
 
 interface FaceEnrollmentDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   staffId: string;
   staffName: string;
 }
 
 export function FaceEnrollmentDialog({ 
   open, 
   onOpenChange, 
   staffId,
   staffName 
 }: FaceEnrollmentDialogProps) {
   const { enrollFace, isEnrolling } = useFaceEnrollment();
   const queryClient = useQueryClient();
 
   const handleCapture = async (imageBase64: string) => {
     const result = await enrollFace(staffId, imageBase64);
     if (result.success) {
       // Invalidate staff queries to refresh enrollment status
       queryClient.invalidateQueries({ queryKey: ['staff'] });
       onOpenChange(false);
     }
   };
 
   const handleCancel = () => {
     if (!isEnrolling) {
       onOpenChange(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={isEnrolling ? undefined : onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>Enroll Face</DialogTitle>
           <DialogDescription>
             Capture a photo of <strong>{staffName}</strong> for biometric clock-in.
             Ensure good lighting and face the camera directly.
           </DialogDescription>
         </DialogHeader>
 
         <FaceEnrollmentCapture
           onCapture={handleCapture}
           onCancel={handleCancel}
           isEnrolling={isEnrolling}
         />
       </DialogContent>
     </Dialog>
   );
 }