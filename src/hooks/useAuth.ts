import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | null;

// Watchdog timeout: if auth doesn't resolve in this time, force loading: false
 const AUTH_TIMEOUT_MS = 4000;

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    role: null,
  });

  useEffect(() => {
    let isMounted = true;
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
    let initialLoadComplete = false;

    const safeSetState = (next: AuthState) => {
      if (!isMounted) return;
       if (!next.loading && watchdogTimer) {
         clearTimeout(watchdogTimer);
         watchdogTimer = null;
       }
      setAuthState(next);
    };

    const fetchRole = async (userId: string): Promise<AppRole> => {
       try {
         const { data, error } = await supabase
           .from('user_roles')
           .select('role')
           .eq('user_id', userId)
           .maybeSingle();
 
         if (error) {
           console.warn('[useAuth] Error fetching role:', error.message);
           return null;
         }
         return (data?.role as AppRole) ?? null;
       } catch (err) {
         console.warn('[useAuth] Exception fetching role:', err);
         return null;
       }
    };

    // 1. SET UP LISTENER FIRST (before getSession) - critical for catching auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] onAuthStateChange:', event);
        
        // Skip if initial load hasn't completed yet - let initializeAuth handle it
        if (!initialLoadComplete) {
          console.log('[useAuth] Skipping - initial load not complete');
          return;
        }

        const user = session?.user ?? null;
        
        // Update user/session immediately (don't await role fetch)
        safeSetState({
          user,
          session,
          loading: false,
          role: authState.role, // Keep existing role temporarily
        });

        // Fetch role in background (fire-and-forget)
        if (user) {
          fetchRole(user.id).then(role => {
            if (isMounted) {
              setAuthState(prev => ({ ...prev, role }));
            }
          });
        } else {
          // User signed out - clear role
          if (isMounted) {
            setAuthState(prev => ({ ...prev, role: null }));
          }
        }
      }
    );

    // Watchdog: force loading: false if stuck
     watchdogTimer = setTimeout(() => {
       if (isMounted) {
         console.warn('[useAuth] Watchdog timeout reached - forcing loading: false');
         safeSetState({ user: null, session: null, loading: false, role: null });
       }
     }, AUTH_TIMEOUT_MS);
 
    // 2. THEN check initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        
        // Await role fetch for initial load only
        const role = user ? await fetchRole(user.id) : null;

        safeSetState({
          user,
          session,
          loading: false,
          role,
        });
        
        initialLoadComplete = true;
      } catch (err) {
        console.error('[useAuth] getSession failed:', err);
        safeSetState({ user: null, session: null, loading: false, role: null });
        initialLoadComplete = true;
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
       if (watchdogTimer) {
         clearTimeout(watchdogTimer);
       }
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    isAdmin: authState.role === 'admin',
    isManager: authState.role === 'manager',
  };
}
