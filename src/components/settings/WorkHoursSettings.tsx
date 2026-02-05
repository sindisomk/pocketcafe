import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Timer, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWorkHoursSettings, WorkHoursSettings as WorkHoursConfig } from '@/hooks/useAppSettings';
import { Skeleton } from '@/components/ui/skeleton';

export function WorkHoursSettings() {
  const { settings, isLoading, updateSettings } = useWorkHoursSettings();
  const [localConfig, setLocalConfig] = useState<WorkHoursConfig | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Sync local state with fetched settings
  useEffect(() => {
    if (settings && !localConfig) {
      setLocalConfig(settings);
    }
  }, [settings, localConfig]);

  const handleChange = <K extends keyof WorkHoursConfig>(field: K, value: WorkHoursConfig[K]) => {
    if (!localConfig) return;
    setLocalConfig((prev) => prev ? { ...prev, [field]: value } : prev);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!localConfig) return;
    updateSettings.mutate(localConfig, {
      onSuccess: () => setIsDirty(false),
    });
  };

  if (isLoading || !localConfig) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isRestPeriodBelowLegal = localConfig.minRestBetweenShifts < 11;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Work Hours & Breaks
        </CardTitle>
        <CardDescription>
          Configure working time rules per UK Working Time Directive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isRestPeriodBelowLegal && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              UK law requires minimum 11 hours rest between shifts. Current setting may cause compliance issues.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="latenessGraceMinutes">Lateness Grace Period (minutes)</Label>
            <Input
              id="latenessGraceMinutes"
              type="number"
              min="0"
              max="60"
              value={localConfig.latenessGraceMinutes}
              onChange={(e) => handleChange('latenessGraceMinutes', Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Staff marked late after this many minutes past shift start
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="noShowThresholdMinutes">No-Show Threshold (minutes)</Label>
            <Input
              id="noShowThresholdMinutes"
              type="number"
              min="15"
              max="120"
              value={localConfig.noShowThresholdMinutes}
              onChange={(e) => handleChange('noShowThresholdMinutes', Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Staff marked as no-show after this many minutes without clock-in
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidBreakMinutes">Paid Break Duration (minutes)</Label>
            <Input
              id="paidBreakMinutes"
              type="number"
              min="0"
              max="120"
              value={localConfig.paidBreakMinutes}
              onChange={(e) => handleChange('paidBreakMinutes', Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Break time included in paid hours
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minRestBetweenShifts">Rest Between Shifts (hours)</Label>
            <Input
              id="minRestBetweenShifts"
              type="number"
              min="0"
              max="24"
              value={localConfig.minRestBetweenShifts}
              onChange={(e) => handleChange('minRestBetweenShifts', Number(e.target.value))}
              className={isRestPeriodBelowLegal ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              UK minimum: 11 hours between shifts
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxWeeklyHours">Maximum Weekly Hours</Label>
            <Input
              id="maxWeeklyHours"
              type="number"
              min="0"
              max="168"
              value={localConfig.maxWeeklyHours}
              onChange={(e) => handleChange('maxWeeklyHours', Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              UK Working Time Directive: 48 hrs without opt-out
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Clock-Out</Label>
              <p className="text-sm text-muted-foreground">
                Automatically clock out staff after extended period
              </p>
            </div>
            <Switch
              checked={localConfig.autoClockOutEnabled}
              onCheckedChange={(checked) => handleChange('autoClockOutEnabled', checked)}
            />
          </div>

          {localConfig.autoClockOutEnabled && (
            <div className="space-y-2">
              <Label htmlFor="autoClockOutHours">Auto Clock-Out After (hours)</Label>
              <Input
                id="autoClockOutHours"
                type="number"
                min="1"
                max="24"
                value={localConfig.autoClockOutHours}
                onChange={(e) => handleChange('autoClockOutHours', Number(e.target.value))}
              />
            </div>
          )}
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
