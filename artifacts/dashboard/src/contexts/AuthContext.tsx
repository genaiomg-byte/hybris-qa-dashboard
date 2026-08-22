import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
  canCreateRun: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchCanCreateRun(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.canCreateRun;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canCreateRun, setCanCreateRun] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      (window as any).__storefrontAuthToken = session?.access_token ?? null;

      if (session?.access_token) {
        const allowed = await fetchCanCreateRun(session.access_token);
        setCanCreateRun(allowed);
      }

      setIsLoading(false);

      if (!session && location !== '/login') {
        setLocation('/login');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      (window as any).__storefrontAuthToken = session?.access_token ?? null;

      if (session?.access_token) {
        const allowed = await fetchCanCreateRun(session.access_token);
        setCanCreateRun(allowed);
      } else {
        setCanCreateRun(false);
      }

      if (!session && location !== '/login') {
        setLocation('/login');
      } else if (session && location === '/login') {
        setLocation('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [location, setLocation]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setCanCreateRun(false);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, signOut, isLoading, canCreateRun }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
