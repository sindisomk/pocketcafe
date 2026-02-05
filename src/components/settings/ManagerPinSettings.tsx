 import { useState } from 'react';
 import { useManagerPin } from '@/hooks/useManagerPin';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { KeyRound, Save, Eye, EyeOff, Shield } from 'lucide-react';
 import { toast } from 'sonner';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 
 export function ManagerPinSettings() {
   const [currentPin, setCurrentPin] = useState('');
   const [newPin, setNewPin] = useState('');
   const [confirmPin, setConfirmPin] = useState('');
   const [showPins, setShowPins] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   const isValid = newPin.length >= 4 && newPin.length <= 8 && /^\d+$/.test(newPin);
   const pinsMatch = newPin === confirmPin;
   const canSubmit = isValid && pinsMatch && newPin.length > 0;
 
   const { setPin } = useManagerPin();
 
   const handleSave = async () => {
     if (!canSubmit) return;
 
     setIsSubmitting(true);
     try {
       const result = await setPin(newPin, currentPin || undefined);
       
       if (result.error) {
         toast.error(result.error);
         return;
       }
       
       toast.success('Manager PIN updated successfully');
       setCurrentPin('');
       setNewPin('');
       setConfirmPin('');
     } catch {
       toast.error('Failed to update PIN');
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <KeyRound className="h-5 w-5 text-primary" />
           Manager Override PIN
         </CardTitle>
         <CardDescription>
           Configure the PIN used for manager overrides on the Kiosk (e.g., manual clock-in).
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-6">
         <Alert>
           <Shield className="h-4 w-4" />
           <AlertDescription>
             This PIN allows managers to override biometric authentication on the Kiosk.
             Keep it secure and change it regularly.
           </AlertDescription>
         </Alert>
 
         <div className="space-y-4 max-w-sm">
           <div className="space-y-2">
             <Label htmlFor="currentPin">Current PIN (if changing)</Label>
             <div className="relative">
               <Input
                 id="currentPin"
                 type={showPins ? 'text' : 'password'}
                 value={currentPin}
                 onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                 placeholder="••••"
                 maxLength={8}
                 className="font-mono"
               />
             </div>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="newPin">New PIN *</Label>
             <div className="relative">
               <Input
                 id="newPin"
                 type={showPins ? 'text' : 'password'}
                 value={newPin}
                 onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                 placeholder="••••"
                 maxLength={8}
                 className="font-mono"
               />
               <Button
                 type="button"
                 variant="ghost"
                 size="icon"
                 className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                 onClick={() => setShowPins(!showPins)}
               >
                 {showPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </Button>
             </div>
             <p className="text-xs text-muted-foreground">
               4-8 digits only
             </p>
             {newPin.length > 0 && !isValid && (
               <p className="text-xs text-destructive">
                 PIN must be 4-8 digits
               </p>
             )}
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="confirmPin">Confirm New PIN *</Label>
             <Input
               id="confirmPin"
               type={showPins ? 'text' : 'password'}
               value={confirmPin}
               onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
               placeholder="••••"
               maxLength={8}
               className="font-mono"
             />
             {confirmPin.length > 0 && !pinsMatch && (
               <p className="text-xs text-destructive">
                 PINs do not match
               </p>
             )}
           </div>
         </div>
 
         <div className="flex justify-end">
           <Button onClick={handleSave} disabled={!canSubmit || isSubmitting} className="gap-2">
             <Save className="h-4 w-4" />
             Update PIN
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }