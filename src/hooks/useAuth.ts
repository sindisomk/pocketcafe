import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | null;

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

    const fetchRole = async (userId: string) => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      return data?.role as AppRole ?? null;
    };

    // Get initial session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      const user = session?.user ?? null;
      const role = user ? await fetchRole(user.id) : null;
      
      setAuthState({
        user,
        session,
        loading: false,
        role,
      });
    });

    // Then set up listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        const user = session?.user ?? null;
        const role = user ? await fetchRole(user.id) : null;
        
        setAuthState({
          user,
          session,
          loading: false,
          role,
        });
      }
    );

    return () => {
      isMounted = false;
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
