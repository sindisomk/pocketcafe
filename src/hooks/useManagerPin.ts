 import { supabase } from "@/integrations/supabase/client";
 
 interface VerifyPinResponse {
   valid: boolean;
   manager_id?: string;
   error?: string;
 }
 
 interface SetPinResponse {
   success?: boolean;
   error?: string;
 }
 
 export function useManagerPin() {
   const verifyPin = async (pin: string): Promise<VerifyPinResponse> => {
     const { data, error } = await supabase.functions.invoke<VerifyPinResponse>(
       "manager-pin",
       {
         body: { action: "verify", pin },
       }
     );
 
     if (error) {
       return { valid: false, error: error.message };
     }
 
     return data ?? { valid: false };
   };
 
   const setPin = async (
     newPin: string,
     currentPin?: string
   ): Promise<SetPinResponse> => {
     const { data, error } = await supabase.functions.invoke<SetPinResponse>(
       "manager-pin",
       {
         body: { action: "set", pin: newPin, current_pin: currentPin },
       }
     );
 
     if (error) {
       return { error: error.message };
     }
 
     return data ?? { error: "Unknown error" };
   };
 
   return { verifyPin, setPin };
 }