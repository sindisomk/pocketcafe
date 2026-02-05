 import { useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 interface EnrollmentResult {
   success: boolean;
   faceToken?: string;
   error?: string;
 }
 
 export function useFaceEnrollment() {
   const [isEnrolling, setIsEnrolling] = useState(false);
 
   const enrollFace = async (staffId: string, imageBase64: string): Promise<EnrollmentResult> => {
     setIsEnrolling(true);
     try {
       const { data, error } = await supabase.functions.invoke('face-enroll', {
         body: { staffId, imageBase64 },
       });
 
       if (error) {
         throw new Error(error.message);
       }
 
       if (!data.success) {
         throw new Error(data.error || 'Enrollment failed');
       }
 
       toast.success('Face enrolled successfully');
       return { success: true, faceToken: data.faceToken };
 
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
       toast.error(`Face enrollment failed: ${errorMessage}`);
       return { success: false, error: errorMessage };
     } finally {
       setIsEnrolling(false);
     }
   };
 
   return {
     enrollFace,
     isEnrolling,
   };
 }