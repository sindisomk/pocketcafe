import { useState, useEffect } from 'react';
import { Coffee } from 'lucide-react';
import { format } from 'date-fns';

interface SleepOverlayProps {
  onWake: () => void;
}

export function SleepOverlay({ onWake }: SleepOverlayProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-sidebar flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={onWake}
      onTouchStart={onWake}
    >
      {/* Animated coffee icon */}
      <div className="mb-8">
        <Coffee className="h-24 w-24 text-primary animate-pulse" />
      </div>

      {/* Large clock display */}
      <p className="text-7xl font-bold text-sidebar-foreground font-mono tracking-wider">
        {format(time, 'HH:mm')}
      </p>

      {/* Seconds (smaller) */}
      <p className="text-3xl font-light text-sidebar-foreground/50 font-mono mt-2">
        {format(time, 'ss')}
      </p>

      {/* Date */}
      <p className="text-2xl text-sidebar-foreground/70 mt-6">
        {format(time, 'EEEE, MMMM d, yyyy')}
      </p>

      {/* Wake instruction */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
        <p className="text-lg text-sidebar-foreground/40 animate-pulse">
          Tap anywhere to wake
        </p>
      </div>

      {/* PocketCafe branding */}
      <div className="absolute top-8 left-8 flex items-center gap-3 opacity-50">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Coffee className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold text-sidebar-foreground">PocketCafe</p>
          <p className="text-sm text-sidebar-foreground/70">Kiosk Mode</p>
        </div>
      </div>
    </div>
  );
}
