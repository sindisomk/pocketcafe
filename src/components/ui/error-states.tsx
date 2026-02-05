import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  className?: string;
  title?: string;
}

export function QueryError({ 
  error, 
  onRetry, 
  className,
  title = 'Failed to load data'
}: QueryErrorProps) {
  return (
    <Card className={cn("border-destructive/50 bg-destructive/5", className)}>
      <CardContent className="py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-destructive">{title}</p>
            {error && (
              <p className="text-sm text-muted-foreground mt-1">
                {error.message}
              </p>
            )}
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ConnectionErrorProps {
  className?: string;
  onRetry?: () => void;
}

export function ConnectionError({ className, onRetry }: ConnectionErrorProps) {
  return (
    <Card className={cn("border-warning/50 bg-warning/5", className)}>
      <CardContent className="py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-3 rounded-full bg-warning/10">
            <WifiOff className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="font-medium">Connection Lost</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please check your internet connection
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground/50">
          {icon}
        </div>
      )}
      <h3 className="font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
