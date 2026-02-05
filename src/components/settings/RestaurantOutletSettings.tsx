 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Button } from '@/components/ui/button';
 import { Store, Save } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface OutletDetails {
   name: string;
   address: string;
   postcode: string;
   phone: string;
   email: string;
   companyNumber: string;
   vatNumber: string;
 }
 
 export function RestaurantOutletSettings() {
   const [details, setDetails] = useState<OutletDetails>({
     name: '',
     address: '',
     postcode: '',
     phone: '',
     email: '',
     companyNumber: '',
     vatNumber: '',
   });
   const [isDirty, setIsDirty] = useState(false);
 
   const handleChange = (field: keyof OutletDetails, value: string) => {
     setDetails((prev) => ({ ...prev, [field]: value }));
     setIsDirty(true);
   };
 
   const handleSave = () => {
     toast.success('Restaurant details saved successfully');
     setIsDirty(false);
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Store className="h-5 w-5 text-primary" />
           Restaurant Outlet Details
         </CardTitle>
         <CardDescription>
           Configure business details for payroll documents and compliance records.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-6">
         <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2 sm:col-span-2">
             <Label htmlFor="outletName">Restaurant Name *</Label>
             <Input
               id="outletName"
               value={details.name}
               onChange={(e) => handleChange('name', e.target.value)}
               placeholder="PocketCafe London"
             />
           </div>
 
           <div className="space-y-2 sm:col-span-2">
             <Label htmlFor="address">Address *</Label>
             <Textarea
               id="address"
               value={details.address}
               onChange={(e) => handleChange('address', e.target.value)}
               placeholder="123 High Street&#10;London"
               rows={2}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="postcode">Postcode *</Label>
             <Input
               id="postcode"
               value={details.postcode}
               onChange={(e) => handleChange('postcode', e.target.value.toUpperCase())}
               placeholder="SW1A 1AA"
               className="uppercase"
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="phone">Phone Number</Label>
             <Input
               id="phone"
               type="tel"
               value={details.phone}
               onChange={(e) => handleChange('phone', e.target.value)}
               placeholder="+44 20 1234 5678"
             />
           </div>
 
           <div className="space-y-2 sm:col-span-2">
             <Label htmlFor="email">Email Address</Label>
             <Input
               id="email"
               type="email"
               value={details.email}
               onChange={(e) => handleChange('email', e.target.value)}
               placeholder="contact@restaurant.co.uk"
             />
           </div>
         </div>
 
         <div className="space-y-4">
           <h4 className="font-medium text-foreground">Legal & Tax Information</h4>
           <div className="grid gap-4 sm:grid-cols-2">
             <div className="space-y-2">
               <Label htmlFor="companyNumber">Company Number</Label>
               <Input
                 id="companyNumber"
                 value={details.companyNumber}
                 onChange={(e) => handleChange('companyNumber', e.target.value)}
                 placeholder="12345678"
                 className="font-mono"
               />
               <p className="text-xs text-muted-foreground">
                 Companies House registration number
               </p>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="vatNumber">VAT Number</Label>
               <Input
                 id="vatNumber"
                 value={details.vatNumber}
                 onChange={(e) => handleChange('vatNumber', e.target.value.toUpperCase())}
                 placeholder="GB 123 4567 89"
                 className="uppercase font-mono"
               />
               <p className="text-xs text-muted-foreground">
                 If VAT registered
               </p>
             </div>
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