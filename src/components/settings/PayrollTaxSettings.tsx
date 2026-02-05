 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Switch } from '@/components/ui/switch';
 import { PoundSterling, Save } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface PayrollConfig {
   payFrequency: 'weekly' | 'fortnightly' | 'monthly';
   payCutoffDay: number; // Day of week/month for payroll cutoff
   nationalMinimumWage21Plus: number;
   nationalMinimumWage18to20: number;
   nationalMinimumWageUnder18: number;
   pensionAutoEnrollEnabled: boolean;
   pensionContributionRate: number;
 }
 
 export function PayrollTaxSettings() {
   const [config, setConfig] = useState<PayrollConfig>({
     payFrequency: 'monthly',
     payCutoffDay: 25,
     nationalMinimumWage21Plus: 11.44,
     nationalMinimumWage18to20: 8.60,
     nationalMinimumWageUnder18: 6.40,
     pensionAutoEnrollEnabled: true,
     pensionContributionRate: 3.0,
   });
   const [isDirty, setIsDirty] = useState(false);
 
   const handleChange = <K extends keyof PayrollConfig>(field: K, value: PayrollConfig[K]) => {
     setConfig((prev) => ({ ...prev, [field]: value }));
     setIsDirty(true);
   };
 
   const handleSave = () => {
     toast.success('Payroll & tax settings saved successfully');
     setIsDirty(false);
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <PoundSterling className="h-5 w-5 text-primary" />
           Payroll & Tax
         </CardTitle>
         <CardDescription>
           Configure payroll cycles and UK National Minimum Wage compliance.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-6">
         <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2">
             <Label htmlFor="payCutoffDay">Pay Cutoff Day</Label>
             <Input
               id="payCutoffDay"
               type="number"
               min="1"
               max="31"
               value={config.payCutoffDay}
               onChange={(e) => handleChange('payCutoffDay', Number(e.target.value))}
             />
             <p className="text-xs text-muted-foreground">
               Day of month payroll is processed
             </p>
           </div>
         </div>
 
         <div className="space-y-4">
           <h4 className="font-medium text-foreground">UK National Minimum Wage (Apr 2024)</h4>
           <div className="grid gap-4 sm:grid-cols-3">
             <div className="space-y-2">
               <Label htmlFor="nmw21">Age 21+ (£/hr)</Label>
               <Input
                 id="nmw21"
                 type="number"
                 step="0.01"
                 min="0"
                 value={config.nationalMinimumWage21Plus}
                 onChange={(e) => handleChange('nationalMinimumWage21Plus', Number(e.target.value))}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="nmw18">Age 18-20 (£/hr)</Label>
               <Input
                 id="nmw18"
                 type="number"
                 step="0.01"
                 min="0"
                 value={config.nationalMinimumWage18to20}
                 onChange={(e) => handleChange('nationalMinimumWage18to20', Number(e.target.value))}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="nmwU18">Under 18 (£/hr)</Label>
               <Input
                 id="nmwU18"
                 type="number"
                 step="0.01"
                 min="0"
                 value={config.nationalMinimumWageUnder18}
                 onChange={(e) => handleChange('nationalMinimumWageUnder18', Number(e.target.value))}
               />
             </div>
           </div>
         </div>
 
         <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
           <div className="flex items-center justify-between">
             <div className="space-y-0.5">
               <Label>Pension Auto-Enrolment</Label>
               <p className="text-sm text-muted-foreground">
                 Automatically enrol eligible staff in workplace pension
               </p>
             </div>
             <Switch
               checked={config.pensionAutoEnrollEnabled}
               onCheckedChange={(checked) => handleChange('pensionAutoEnrollEnabled', checked)}
             />
           </div>
 
           {config.pensionAutoEnrollEnabled && (
             <div className="space-y-2">
               <Label htmlFor="pensionRate">Employer Contribution Rate (%)</Label>
               <Input
                 id="pensionRate"
                 type="number"
                 step="0.1"
                 min="0"
                 max="100"
                 value={config.pensionContributionRate}
                 onChange={(e) => handleChange('pensionContributionRate', Number(e.target.value))}
               />
               <p className="text-xs text-muted-foreground">
                 UK minimum: 3% employer contribution
               </p>
             </div>
           )}
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