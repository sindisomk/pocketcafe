 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Wallet, Save } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface DepartmentBudget {
   kitchen: number;
   floor: number;
   management: number;
 }
 
 export function DepartmentBudgetSettings() {
   const [budgets, setBudgets] = useState<DepartmentBudget>({
     kitchen: 5000,
     floor: 6000,
     management: 3000,
   });
   const [isDirty, setIsDirty] = useState(false);
 
   const handleChange = (department: keyof DepartmentBudget, value: number) => {
     setBudgets((prev) => ({ ...prev, [department]: value }));
     setIsDirty(true);
   };
 
   const handleSave = () => {
     toast.success('Department budgets saved successfully');
     setIsDirty(false);
   };
 
   const totalBudget = budgets.kitchen + budgets.floor + budgets.management;
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Wallet className="h-5 w-5 text-primary" />
           Department Labor Budgets
         </CardTitle>
         <CardDescription>
           Set weekly labor cost budgets for each department.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-6">
         <div className="grid gap-4 sm:grid-cols-3">
           <div className="space-y-2">
          <Label htmlFor="kitchenBudget" className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-warning" />
               Kitchen
             </Label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
               <Input
                 id="kitchenBudget"
                 type="number"
                 min="0"
                 step="100"
                 value={budgets.kitchen}
                 onChange={(e) => handleChange('kitchen', Number(e.target.value))}
                 className="pl-7"
               />
             </div>
             <p className="text-xs text-muted-foreground">Weekly budget</p>
           </div>
 
           <div className="space-y-2">
          <Label htmlFor="floorBudget" className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-primary" />
               Floor
             </Label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
               <Input
                 id="floorBudget"
                 type="number"
                 min="0"
                 step="100"
                 value={budgets.floor}
                 onChange={(e) => handleChange('floor', Number(e.target.value))}
                 className="pl-7"
               />
             </div>
             <p className="text-xs text-muted-foreground">Weekly budget</p>
           </div>
 
           <div className="space-y-2">
          <Label htmlFor="managementBudget" className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-ring" />
               Management
             </Label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
               <Input
                 id="managementBudget"
                 type="number"
                 min="0"
                 step="100"
                 value={budgets.management}
                 onChange={(e) => handleChange('management', Number(e.target.value))}
                 className="pl-7"
               />
             </div>
             <p className="text-xs text-muted-foreground">Weekly budget</p>
           </div>
         </div>
 
         <div className="rounded-lg border p-4 bg-muted/30">
           <div className="flex items-center justify-between">
             <span className="text-sm font-medium text-muted-foreground">Total Weekly Budget</span>
             <span className="text-xl font-semibold text-foreground">
               £{totalBudget.toLocaleString()}
             </span>
           </div>
         </div>
 
         <div className="flex justify-end">
           <Button onClick={handleSave} disabled={!isDirty} className="gap-2">
             <Save className="h-4 w-4" />
             Save Changes
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }