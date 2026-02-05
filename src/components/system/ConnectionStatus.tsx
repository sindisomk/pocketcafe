import { useRealtimeStatus } from '@/providers/RealtimeProvider';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ConnectionStatusProps {
  className?: string;
  showLastSync?: boolean;
}

export function ConnectionStatus({ className, showLastSync = false }: ConnectionStatusProps) {
  const { isConnected, lastSync } = useRealtimeStatus();

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs",
      className
    )}>
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full",
        isConnected 
          ? "bg-success/10 text-success" 
          : "bg-warning/10 text-warning"
      )}>
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Reconnecting...</span>
          </>
        )}
      </div>
      
      {showLastSync && lastSync && (
        <span className="text-muted-foreground">
          Last update: {format(lastSync, 'HH:mm:ss')}
        </span>
      )}
    </div>
  );
}
