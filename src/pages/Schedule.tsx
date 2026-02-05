import { SchedulerGrid } from '@/components/scheduler/SchedulerGrid';

export default function Schedule() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drag staff to assign shifts. Labour costs update in real-time.
        </p>
      </div>

      <SchedulerGrid />
    </div>
  );
}
