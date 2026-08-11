import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_COMMITMENTS, DEMO_CONNECTIONS, DEMO_IDEAS, DEMO_USERS } from "./demo-data";
import { DEMO_PROVINCE_NOTES } from "./demo-province-notes";
import type { Commitment, Connection, ConnectionStatus, Idea, ProvinceNote, User } from "./types";

const KEY = "connecting-power-v1";

type State = {
  me: User | null;
  users: User[];
  ideas: Idea[];
  connections: Connection[];
  commitments: Commitment[];
  savedIdeas: string[];
  provinceNotes: ProvinceNote[];
};

const initial: State = {
  me: null,
  users: DEMO_USERS,
  ideas: DEMO_IDEAS,
  connections: DEMO_CONNECTIONS,
  commitments: DEMO_COMMITMENTS,
  savedIdeas: [],
  provinceNotes: DEMO_PROVINCE_NOTES,
};

type Store = State & {
  hydrated: boolean;
  saveProfile: (u: Omit<User, "id" | "created_at" | "avatar"> & { avatar?: string }) => User;
  connect: (otherId: string, score: number, reason: string) => Connection;
  addCommitment: (c: Omit<Commitment, "id" | "created_at">) => Commitment;
  setConnectionStatus: (id: string, status: ConnectionStatus) => void;
  toggleSaveIdea: (id: string) => void;
  addProvinceNote: (n: Omit<ProvinceNote, "id" | "created_at">) => ProvinceNote;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState((s) => ({ ...s, ...parsed, users: parsed.users?.length ? parsed.users : s.users }));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const saveProfile: Store["saveProfile"] = useCallback((data) => {
    const user: User = {
      ...data,
      avatar: data.avatar || "✨",
      id: "me",
      created_at: new Date().toISOString(),
    };
    setState((s) => ({
      ...s,
      me: user,
      users: [user, ...s.users.filter((u) => u.id !== "me")],
    }));
    return user;
  }, []);

  const connect: Store["connect"] = useCallback((otherId, score, reason) => {
    const conn: Connection = {
      id: `c-${Date.now()}`,
      user_a: "me",
      user_b: otherId,
      match_score: score,
      match_reason: reason,
      status: "Connected",
      created_at: new Date().toISOString(),
    };
    setState((s) => {
      const existing = s.connections.find(
        (c) => (c.user_a === "me" && c.user_b === otherId) || (c.user_b === "me" && c.user_a === otherId),
      );
      if (existing) return s;
      return { ...s, connections: [conn, ...s.connections] };
    });
    return conn;
  }, []);

  const addCommitment: Store["addCommitment"] = useCallback((c) => {
    const item: Commitment = { ...c, id: `m-${Date.now()}`, created_at: new Date().toISOString() };
    setState((s) => ({
      ...s,
      commitments: [item, ...s.commitments],
      connections: s.connections.map((x) =>
        x.id === c.connection_id ? { ...x, status: c.status } : x,
      ),
    }));
    return item;
  }, []);

  const setConnectionStatus: Store["setConnectionStatus"] = useCallback((id, status) => {
    setState((s) => ({
      ...s,
      connections: s.connections.map((c) => (c.id === id ? { ...c, status } : c)),
      commitments: s.commitments.map((m) => (m.connection_id === id ? { ...m, status } : m)),
    }));
  }, []);

  const toggleSaveIdea: Store["toggleSaveIdea"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      savedIdeas: s.savedIdeas.includes(id)
        ? s.savedIdeas.filter((x) => x !== id)
        : [...s.savedIdeas, id],
    }));
  }, []);

  const addProvinceNote: Store["addProvinceNote"] = useCallback((n) => {
    const note: ProvinceNote = { ...n, id: `pn-${Date.now()}`, created_at: new Date().toISOString() };
    setState((s) => ({ ...s, provinceNotes: [note, ...s.provinceNotes] }));
    return note;
  }, []);

  const reset = useCallback(() => setState(initial), []);

  const value = useMemo<Store>(
    () => ({
      ...state,
      hydrated,
      saveProfile,
      connect,
      addCommitment,
      setConnectionStatus,
      toggleSaveIdea,
      addProvinceNote,
      reset,
    }),
    [state, hydrated, saveProfile, connect, addCommitment, setConnectionStatus, toggleSaveIdea, addProvinceNote, reset],
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useUserMap() {
  const { users } = useStore();
  return useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
}
