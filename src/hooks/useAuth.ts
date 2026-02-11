import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { devLog, devWarn } from '@/lib/logger';

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
           devWarn('[useAuth] Error fetching role:', error.message);
           return null;
         }
         return (data?.role as AppRole) ?? null;
       } catch (err) {
         devWarn('[useAuth] Exception fetching role:', err);
         return null;
       }
    };

    // 1. SET UP LISTENER FIRST (before getSession) - critical for catching auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        devLog('[useAuth] onAuthStateChange:', event);
        if (!initialLoadComplete) return;

        const user = session?.user ?? null;

        // Clear role when user changes so we never show previous user's role
        safeSetState({
          user,
          session,
          loading: false,
          role: null,
        });

        if (user) {
          fetchRole(user.id)
            .then((role) => {
              if (isMounted) {
                setAuthState((prev) => ({ ...prev, role }));
              }
            })
            .catch(() => {
              // Role fetch failed; state already has role: null, no need to update
            });
        }
      }
    );

    // Watchdog: force loading: false if stuck
     watchdogTimer = setTimeout(() => {
       if (isMounted) {
         devWarn('[useAuth] Watchdog timeout reached - forcing loading: false');
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
