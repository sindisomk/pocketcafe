 import { AlertTriangle, Clock } from 'lucide-react';
 import { Card, CardContent } from '@/components/ui/card';
 import { ComplianceWarning } from '@/types/attendance';
 
 interface ComplianceWarningCardProps {
   warning: ComplianceWarning;
 }
 
 export function ComplianceWarningCard({ warning }: ComplianceWarningCardProps) {
   return (
     <Card className="border-warning/50">
       <CardContent className="pt-4">
         <div className="flex items-start gap-3">
           <div className="p-2 bg-warning/10 rounded-lg shrink-0">
             <AlertTriangle className="h-4 w-4 text-warning" />
           </div>
           <div className="min-w-0">
             <p className="font-medium text-sm">{warning.staffName}</p>
             <p className="text-xs text-muted-foreground mt-0.5">
               {warning.message}
             </p>
             {warning.previousShiftEnd && warning.nextShiftStart && (
               <div className="flex items-center gap-2 mt-2 text-xs">
                 <Clock className="h-3 w-3 text-muted-foreground" />
                 <span>{warning.previousShiftEnd}</span>
                 <span>→</span>
                 <span>{warning.nextShiftStart}</span>
               </div>
             )}
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }