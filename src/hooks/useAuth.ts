import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | null;
 
 // Watchdog timeout: if auth doesn't resolve in this time, force redirect to login
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

    const safeSetState = (next: AuthState) => {
      if (!isMounted) return;
       // Clear watchdog when we successfully set state with loading: false
       if (!next.loading && watchdogTimer) {
         clearTimeout(watchdogTimer);
         watchdogTimer = null;
       }
      setAuthState(next);
    };

    const fetchRole = async (userId: string) => {
       try {
         const { data, error } = await supabase
           .from('user_roles')
           .select('role')
           .eq('user_id', userId)
           .maybeSingle();
 
         // If RLS blocks role reads (or any other error), don't brick the app.
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

     // Watchdog: if loading doesn't resolve in time, force-complete with no user
     watchdogTimer = setTimeout(() => {
       if (isMounted) {
         console.warn('[useAuth] Watchdog timeout reached - forcing loading: false');
         safeSetState({ user: null, session: null, loading: false, role: null });
       }
     }, AUTH_TIMEOUT_MS);
 
    // Get initial session first
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        const user = session?.user ?? null;
        const role = user ? await fetchRole(user.id) : null;

        safeSetState({
          user,
          session,
          loading: false,
          role,
        });
      })
      .catch(() => {
        // Never keep the UI stuck loading on unexpected failures.
         console.error('[useAuth] getSession failed');
        safeSetState({ user: null, session: null, loading: false, role: null });
      });

    // Then set up listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        const user = session?.user ?? null;
        const role = user ? await fetchRole(user.id) : null;

        safeSetState({
          user,
          session,
          loading: false,
          role,
        });
      } catch {
        safeSetState({ user: null, session: null, loading: false, role: null });
      }
    });

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
