import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { emitLive } from "./live";
import { DEMO_COMMITMENTS, DEMO_CONNECTIONS, DEMO_IDEAS, DEMO_USERS } from "./demo-data";
import { DEMO_PROVINCE_NOTES } from "./demo-province-notes";
import { DEMO_SUBMISSIONS } from "./demo-submissions";
import type {
  AppNotification,
  Commitment,
  Connection,
  ConnectionStatus,
  Idea,
  ProvinceNote,
  Submission,
  User,
} from "./types";

const KEY = "connecting-power-v1";

type State = {
  me: User | null;
  users: User[];
  ideas: Idea[];
  connections: Connection[];
  commitments: Commitment[];
  savedIdeas: string[];
  likedUsers: string[];
  skippedUsers: string[];
  provinceNotes: ProvinceNote[];
  submissions: Submission[];
  notifications: AppNotification[];
};

const initial: State = {
  me: null,
  users: DEMO_USERS,
  ideas: DEMO_IDEAS,
  connections: DEMO_CONNECTIONS,
  commitments: DEMO_COMMITMENTS,
  savedIdeas: [],
  likedUsers: [],
  skippedUsers: [],
  provinceNotes: DEMO_PROVINCE_NOTES,
  submissions: DEMO_SUBMISSIONS,
  notifications: [],
};

type Store = State & {
  hydrated: boolean;
  saveProfile: (u: Omit<User, "id" | "created_at" | "avatar"> & { avatar?: string }) => User;
  connect: (otherId: string, score: number, reason: string) => Connection;
  addCommitment: (c: Omit<Commitment, "id" | "created_at">) => Commitment;
  setConnectionStatus: (id: string, status: ConnectionStatus) => void;
  toggleSaveIdea: (id: string) => void;
  toggleLikeUser: (id: string) => boolean;
  skipUser: (id: string) => void;
  undoSkip: () => void;
  addProvinceNote: (n: Omit<ProvinceNote, "id" | "created_at">) => ProvinceNote;
  addSubmission: (s: Omit<Submission, "id" | "created_at" | "showcase">) => Submission;
  toggleShowcase: (id: string) => void;
  linkAccount: (email: string, userId: string) => void;
  importUsers: (list: User[]) => number;
  notify: (n: Omit<AppNotification, "id" | "created_at" | "read">) => AppNotification;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  reset: () => void;
};

const scheduledReplies = new Set<string>();

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
    const now = new Date().toISOString();
    let saved: User = {
      ...data,
      avatar: data.avatar || "✨",
      id: "me",
      created_at: now,
      updated_at: now,
    };
    setState((s) => {
      const user: User = { ...saved, created_at: s.me?.created_at ?? now };
      saved = user;
      return {
        ...s,
        me: user,
        users: [user, ...s.users.filter((u) => u.id !== "me")],
      };
    });
    emitLive("match", "พบคู่แมตช์ใหม่", `${saved.name} เข้าร่วมและพร้อมจับคู่พลัง`);
    return saved;
  }, []);

  const linkAccount: Store["linkAccount"] = useCallback((email, userId) => {
    const now = new Date().toISOString();
    setState((s) => {
      if (!s.me) return s;
      const user: User = { ...s.me, linked_email: email, linked_user_id: userId, linked_at: now };
      return {
        ...s,
        me: user,
        users: s.users.map((u) => (u.id === "me" ? user : u)),
      };
    });
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
      const other = s.users.find((u) => u.id === otherId);
      const name = other?.name ?? "เพื่อนใหม่";
      const sent: AppNotification = {
        id: `n-${Date.now()}`,
        kind: "connect_sent",
        title: "ส่งคำขอเชื่อมแล้ว",
        body: `กำลังส่งสัญญาณถึง ${name}…`,
        from_id: otherId,
        from_name: name,
        connection_id: conn.id,
        read: false,
        created_at: new Date().toISOString(),
      };
      // จำลองการตอบรับจากอีกฝ่าย (ต้นแบบฝั่ง client)
      if (scheduledReplies.has(conn.id)) return { ...s, connections: [conn, ...s.connections], notifications: [sent, ...s.notifications] };
      scheduledReplies.add(conn.id);
      setTimeout(() => {
        setState((cur) => {
          if (cur.notifications.some((n) => n.kind === "accepted" && n.connection_id === conn.id)) return cur;
          return {
          ...cur,
          notifications: [
            {
              id: `n-${Date.now()}-a`,
              kind: "accepted",
              title: `${name} ตอบรับการเชื่อมแล้ว ✨`,
              body: "แตะเพื่อกำหนดก้าวต่อไปร่วมกัน",
              from_id: otherId,
              from_name: name,
              connection_id: conn.id,
              read: false,
              created_at: new Date().toISOString(),
            },
            ...cur.notifications,
          ],
          };
        });
        emitLive("connect", `${name} ตอบรับการเชื่อมแล้ว`, "พร้อมกำหนดก้าวต่อไปร่วมกัน");
      }, 2600);
      emitLive("connect", "เชื่อมต่อใหม่", `คุณ ↔ ${name} · แมตช์ ${score}%`);
      return { ...s, connections: [conn, ...s.connections], notifications: [sent, ...s.notifications] };
    });
    return conn;
  }, []);

  const addCommitment: Store["addCommitment"] = useCallback((c) => {
    const item: Commitment = { ...c, id: `m-${Date.now()}`, created_at: new Date().toISOString() };
    setState((s) => {
      const conn = s.connections.find((x) => x.id === c.connection_id);
      const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
      const name = s.users.find((u) => u.id === otherId)?.name ?? "เพื่อนร่วมงาน";
      const note: AppNotification = {
        id: `n-${Date.now()}-c`,
        kind: "commitment",
        title: "ส่งก้าวต่อไปให้เพื่อนแล้ว 🚀",
        body: `แจ้งเตือน ${name} เรื่อง “${c.action_type}”`,
        from_id: otherId,
        from_name: name,
        connection_id: c.connection_id,
        read: false,
        created_at: new Date().toISOString(),
      };
      emitLive("commitment", "คำมั่นสัญญาใหม่", `${c.action_type} กับ ${name}`);
      return {
      ...s,
      notifications: [note, ...s.notifications],
      commitments: [item, ...s.commitments],
      connections: s.connections.map((x) =>
        x.id === c.connection_id ? { ...x, status: c.status } : x,
      ),
      };
    });
    return item;
  }, []);

  const setConnectionStatus: Store["setConnectionStatus"] = useCallback((id, status) => {
    setState((s) => {
      const conn = s.connections.find((c) => c.id === id);
      const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
      const name = s.users.find((u) => u.id === otherId)?.name ?? "เพื่อนร่วมงาน";
      emitLive("commitment", "อัปเดตความคืบหน้า", `${name} · สถานะ: ${status}`);
      return {
      ...s,
      connections: s.connections.map((c) => (c.id === id ? { ...c, status } : c)),
      commitments: s.commitments.map((m) => (m.connection_id === id ? { ...m, status } : m)),
      };
    });
  }, []);

  const toggleSaveIdea: Store["toggleSaveIdea"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      savedIdeas: s.savedIdeas.includes(id)
        ? s.savedIdeas.filter((x) => x !== id)
        : [...s.savedIdeas, id],
    }));
  }, []);

  const toggleLikeUser: Store["toggleLikeUser"] = useCallback((id) => {
    let liked = false;
    setState((s) => {
      liked = !s.likedUsers.includes(id);
      if (liked) {
        const name = s.users.find((u) => u.id === id)?.name ?? "เพื่อนใหม่";
        emitLive("like", "กดถูกใจ", `คุณถูกใจโปรไฟล์ของ ${name}`);
      }
      return {
        ...s,
        likedUsers: liked ? [...s.likedUsers, id] : s.likedUsers.filter((x) => x !== id),
        skippedUsers: s.skippedUsers.filter((x) => x !== id),
      };
    });
    return liked;
  }, []);

  const skipUser: Store["skipUser"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      skippedUsers: s.skippedUsers.includes(id) ? s.skippedUsers : [...s.skippedUsers, id],
      likedUsers: s.likedUsers.filter((x) => x !== id),
    }));
  }, []);

  const undoSkip: Store["undoSkip"] = useCallback(() => {
    setState((s) => ({ ...s, skippedUsers: s.skippedUsers.slice(0, -1) }));
  }, []);

  const addProvinceNote: Store["addProvinceNote"] = useCallback((n) => {
    const note: ProvinceNote = { ...n, id: `pn-${Date.now()}`, created_at: new Date().toISOString() };
    setState((s) => ({ ...s, provinceNotes: [note, ...s.provinceNotes] }));
    return note;
  }, []);

  const addSubmission: Store["addSubmission"] = useCallback((data) => {
    const item: Submission = {
      ...data,
      showcase: false,
      id: `sb-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setState((s) => ({ ...s, submissions: [item, ...s.submissions] }));
    return item;
  }, []);

  const toggleShowcase: Store["toggleShowcase"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      submissions: s.submissions.map((x) => (x.id === id ? { ...x, showcase: !x.showcase } : x)),
    }));
  }, []);

  const importUsers: Store["importUsers"] = useCallback((list) => {
    setState((s) => {
      const existing = new Set(s.users.map((u) => u.id));
      const fresh = list.filter((u) => !existing.has(u.id));
      return { ...s, users: [...fresh, ...s.users] };
    });
    return list.length;
  }, []);

  const notify: Store["notify"] = useCallback((n) => {
    const item: AppNotification = {
      ...n,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    setState((s) => ({ ...s, notifications: [item, ...s.notifications] }));
    return item;
  }, []);

  const markNotificationsRead: Store["markNotificationsRead"] = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const clearNotifications: Store["clearNotifications"] = useCallback(() => {
    setState((s) => ({ ...s, notifications: [] }));
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
      toggleLikeUser,
      skipUser,
      undoSkip,
      addProvinceNote,
      addSubmission,
      toggleShowcase,
      linkAccount,
      importUsers,
      notify,
      markNotificationsRead,
      clearNotifications,
      reset,
    }),
    [state, hydrated, saveProfile, connect, addCommitment, setConnectionStatus, toggleSaveIdea, toggleLikeUser, skipUser, undoSkip, addProvinceNote, addSubmission, toggleShowcase, linkAccount, importUsers, notify, markNotificationsRead, clearNotifications, reset],
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
