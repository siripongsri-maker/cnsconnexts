import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

const GUEST_KEY = "khonso-guest-mode";

export type AuthMode = "loading" | "user" | "guest" | "anon";

type AuthValue = {
  mode: AuthMode;
  session: Session | null;
  user: User | null;
  guest: boolean;
  displayName: string | null;
  enterGuest: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    try {
      setGuest(localStorage.getItem(GUEST_KEY) === "1");
    } catch {
      /* ignore */
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(() => {
    const mode: AuthMode = !ready ? "loading" : session ? "user" : guest ? "guest" : "anon";
    const meta = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName = session
      ? ((meta["full_name"] as string) ?? (meta["name"] as string) ?? session.user.email ?? "สมาชิก")
      : guest
        ? "ผู้เยี่ยมชม (Guest)"
        : null;

    return {
      mode,
      session,
      user: session?.user ?? null,
      guest,
      displayName,
      enterGuest: () => {
        try {
          localStorage.setItem(GUEST_KEY, "1");
        } catch {
          /* ignore */
        }
        setGuest(true);
      },
      signOut: async () => {
        try {
          localStorage.removeItem(GUEST_KEY);
        } catch {
          /* ignore */
        }
        setGuest(false);
        await supabase.auth.signOut();
      },
    };
  }, [ready, session, guest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
