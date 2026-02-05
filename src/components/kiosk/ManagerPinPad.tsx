 import { useState } from 'react';
 import { KeyRound, Delete, Loader2, X } from 'lucide-react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 interface ManagerPinPadProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onPinVerified: () => void;
 }
 
 export function ManagerPinPad({ open, onOpenChange, onPinVerified }: ManagerPinPadProps) {
   const [pin, setPin] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [isVerifying, setIsVerifying] = useState(false);
 
   const handleDigit = (digit: string) => {
     if (pin.length < 6) {
       setPin((prev) => prev + digit);
       setError(null);
     }
   };
 
   const handleDelete = () => {
     setPin((prev) => prev.slice(0, -1));
     setError(null);
   };
 
   const handleClear = () => {
     setPin('');
     setError(null);
   };
 
   const handleVerify = async () => {
     if (pin.length < 4) {
       setError('PIN must be at least 4 digits');
       return;
     }
 
     setIsVerifying(true);
     
     // In production, this would verify against manager_pins table
     // For demo, accept any 4+ digit PIN
     setTimeout(() => {
       setIsVerifying(false);
       
       // Simulated verification (replace with actual Supabase check)
       if (pin.length >= 4) {
         onPinVerified();
         setPin('');
         onOpenChange(false);
       } else {
         setError('Invalid PIN');
       }
     }, 1000);
   };
 
   const handleClose = () => {
     setPin('');
     setError(null);
     onOpenChange(false);
   };
 
   const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="sm:max-w-sm">
         <DialogHeader className="text-center">
           <div className="flex justify-center mb-2">
             <div className="p-3 bg-primary/10 rounded-full">
               <KeyRound className="h-8 w-8 text-primary" />
             </div>
           </div>
           <DialogTitle>Manager Override</DialogTitle>
           <DialogDescription>
             Enter your manager PIN to override
           </DialogDescription>
         </DialogHeader>
 
         {/* PIN display */}
         <div className="flex justify-center gap-2 my-4">
           {[0, 1, 2, 3, 4, 5].map((i) => (
             <div
               key={i}
               className={cn(
                 "w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-mono",
                 pin.length > i ? "border-primary bg-primary/5" : "border-input",
                 error && "border-destructive"
               )}
             >
               {pin[i] ? '•' : ''}
             </div>
           ))}
         </div>
 
         {error && (
           <p className="text-sm text-destructive text-center mb-2">{error}</p>
         )}
 
         {/* Numeric keypad */}
         <div className="grid grid-cols-3 gap-2">
           {digits.map((digit, index) => (
             <div key={index}>
               {digit ? (
                 <Button
                   variant="outline"
                   size="lg"
                   className="w-full h-14 text-xl font-medium"
                   onClick={() => handleDigit(digit)}
                   disabled={isVerifying}
                 >
                   {digit}
                 </Button>
               ) : index === 9 ? (
                 <Button
                   variant="ghost"
                   size="lg"
                   className="w-full h-14"
                   onClick={handleClear}
                   disabled={isVerifying}
                 >
                   <X className="h-5 w-5" />
                 </Button>
               ) : (
                 <Button
                   variant="ghost"
                   size="lg"
                   className="w-full h-14"
                   onClick={handleDelete}
                   disabled={isVerifying}
                 >
                   <Delete className="h-5 w-5" />
                 </Button>
               )}
             </div>
           ))}
         </div>
 
         {/* Verify button */}
         <Button
           size="lg"
           className="w-full mt-4"
           onClick={handleVerify}
           disabled={pin.length < 4 || isVerifying}
         >
           {isVerifying ? (
             <>
               <Loader2 className="h-4 w-4 animate-spin mr-2" />
               Verifying...
             </>
           ) : (
             'Verify PIN'
           )}
         </Button>
       </DialogContent>
     </Dialog>
   );
 }