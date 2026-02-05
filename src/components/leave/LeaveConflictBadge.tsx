 import { AlertTriangle } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
 } from '@/components/ui/tooltip';
 
 interface LeaveConflictBadgeProps {
   count: number;
 }
 
 export function LeaveConflictBadge({ count }: LeaveConflictBadgeProps) {
   return (
     <Tooltip>
       <TooltipTrigger>
         <Badge variant="outline" className="border-warning text-warning gap-1">
           <AlertTriangle className="h-3 w-3" />
           {count}
         </Badge>
       </TooltipTrigger>
       <TooltipContent>
         <p>{count} other staff member{count > 1 ? 's are' : ' is'} off on overlapping dates</p>
       </TooltipContent>
     </Tooltip>
   );
 }