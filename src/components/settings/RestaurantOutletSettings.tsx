import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Store, Save, Loader2 } from 'lucide-react';
import { useOutletSettings, OutletSettings } from '@/hooks/useOutletSettings';

export function RestaurantOutletSettings() {
  const { settings, isLoading, updateSettings } = useOutletSettings();
  const [localDetails, setLocalDetails] = useState<OutletSettings>(settings);
  const [isDirty, setIsDirty] = useState(false);

  // Sync local state when settings load
  useEffect(() => {
    setLocalDetails(settings);
  }, [settings]);

  const handleChange = (field: keyof OutletSettings, value: string) => {
    setLocalDetails((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate(localDetails, {
      onSuccess: () => setIsDirty(false),
    });
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
                value={localDetails.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="PocketCafe London"
                disabled={isLoading}
              />
            </div>
 
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={localDetails.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 High Street&#10;London"
                rows={2}
                disabled={isLoading}
              />
            </div>
 
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                value={localDetails.postcode}
                onChange={(e) => handleChange('postcode', e.target.value.toUpperCase())}
                placeholder="SW1A 1AA"
                className="uppercase"
                disabled={isLoading}
              />
            </div>
 
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={localDetails.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+44 20 1234 5678"
                disabled={isLoading}
              />
            </div>
 
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={localDetails.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@restaurant.co.uk"
                disabled={isLoading}
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
                  value={localDetails.companyNumber}
                  onChange={(e) => handleChange('companyNumber', e.target.value)}
                  placeholder="12345678"
                  className="font-mono"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Companies House registration number
                </p>
              </div>
 
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  value={localDetails.vatNumber}
                  onChange={(e) => handleChange('vatNumber', e.target.value.toUpperCase())}
                  placeholder="GB 123 4567 89"
                  className="uppercase font-mono"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  If VAT registered
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={!isDirty || updateSettings.isPending} 
              className="gap-2"
            >
              {updateSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }