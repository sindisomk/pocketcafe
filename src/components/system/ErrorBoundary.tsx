 import { Component, ErrorInfo, ReactNode } from 'react';
 import { Button } from '@/components/ui/button';
 import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
 
 interface Props {
   children: ReactNode;
 }
 
 interface State {
   hasError: boolean;
   error: Error | null;
   errorInfo: ErrorInfo | null;
 }
 
 export class ErrorBoundary extends Component<Props, State> {
   constructor(props: Props) {
     super(props);
     this.state = { hasError: false, error: null, errorInfo: null };
   }
 
   static getDerivedStateFromError(error: Error): Partial<State> {
     return { hasError: true, error };
   }
 
   componentDidCatch(error: Error, errorInfo: ErrorInfo) {
     console.error('[ErrorBoundary] Caught error:', error);
     console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
     this.setState({ errorInfo });
   }
 
   handleReload = () => {
     window.location.reload();
   };
 
   handleGoToLogin = () => {
     window.location.href = '/login';
   };
 
   render() {
     if (this.state.hasError) {
       return (
         <div className="flex min-h-screen items-center justify-center bg-background p-4">
           <div className="w-full max-w-md space-y-6 text-center">
             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
               <AlertTriangle className="h-8 w-8 text-destructive" />
             </div>
             
             <div className="space-y-2">
               <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
               <p className="text-muted-foreground">
                 The application encountered an unexpected error. Please try reloading or go back to login.
               </p>
             </div>
 
             <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
               <Button onClick={this.handleReload} variant="default">
                 <RefreshCw className="mr-2 h-4 w-4" />
                 Reload Page
               </Button>
               <Button onClick={this.handleGoToLogin} variant="outline">
                 <LogIn className="mr-2 h-4 w-4" />
                 Go to Login
               </Button>
             </div>
 
             {/* Dev-only error details */}
             {import.meta.env.DEV && this.state.error && (
               <details className="mt-6 rounded-lg border border-border bg-muted/50 p-4 text-left">
                 <summary className="cursor-pointer font-medium text-foreground">
                   Error Details (Dev Only)
                 </summary>
                 <div className="mt-3 space-y-2 text-sm">
                   <div>
                     <span className="font-medium text-destructive">Error: </span>
                     <code className="text-muted-foreground">{this.state.error.message}</code>
                   </div>
                   {this.state.error.stack && (
                     <pre className="mt-2 max-h-48 overflow-auto rounded bg-background p-2 text-xs text-muted-foreground">
                       {this.state.error.stack}
                     </pre>
                   )}
                   {this.state.errorInfo?.componentStack && (
                     <div>
                       <span className="font-medium">Component Stack:</span>
                       <pre className="mt-1 max-h-32 overflow-auto rounded bg-background p-2 text-xs text-muted-foreground">
                         {this.state.errorInfo.componentStack}
                       </pre>
                     </div>
                   )}
                 </div>
               </details>
             )}
           </div>
         </div>
       );
     }
 
     return this.props.children;
   }
 }