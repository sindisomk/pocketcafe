import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TrendingUp, Save } from 'lucide-react';
import { useOvertimeSettings, OvertimeConfig } from '@/hooks/useOvertimeSettings';
import { Skeleton } from '@/components/ui/skeleton';

export function OvertimeSettings() {
  const { settings, isLoading, updateSettings } = useOvertimeSettings();
  const [config, setConfig] = useState<OvertimeConfig>(settings);
  const [isDirty, setIsDirty] = useState(false);

  // Sync local state when DB settings load
  useEffect(() => {
    setConfig(settings);
  }, [settings]);

  const handleChange = <K extends keyof OvertimeConfig>(field: K, value: OvertimeConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate(config);
    setIsDirty(false);
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Overtime & Premium Pay
        </CardTitle>
        <CardDescription>
          Configure overtime thresholds and pay multipliers per UK Working Time Directive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
          <div className="space-y-0.5">
            <Label>Enable Overtime Calculations</Label>
            <p className="text-sm text-muted-foreground">
              Automatically apply overtime rates when thresholds are exceeded
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weeklyThreshold">Weekly Threshold (hours)</Label>
            <Input
              id="weeklyThreshold"
              type="number"
              min="0"
              max="168"
              value={config.weeklyThreshold}
              onChange={(e) => handleChange('weeklyThreshold', Number(e.target.value))}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              UK standard: 48 hrs/week (Working Time Directive)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyThreshold">Daily Threshold (hours)</Label>
            <Input
              id="dailyThreshold"
              type="number"
              min="0"
              max="24"
              value={config.dailyThreshold}
              onChange={(e) => handleChange('dailyThreshold', Number(e.target.value))}
              disabled={!config.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate">Overtime Rate (multiplier)</Label>
            <Input
              id="rate"
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={config.rate}
              onChange={(e) => handleChange('rate', Number(e.target.value))}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              1.5 = Time and a half, 2.0 = Double time
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankHolidayRate">Bank Holiday Rate</Label>
            <Input
              id="bankHolidayRate"
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={config.bankHolidayRate}
              onChange={(e) => handleChange('bankHolidayRate', Number(e.target.value))}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Rate applied for UK bank holidays
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateSettings.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
