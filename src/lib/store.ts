import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitLive } from "./live";
import type {
  AppNotification,
  ChatMessage,
  Commitment,
  Connection,
  ConnectionStatus,
  Idea,
  ProvinceNote,
  Rsvp,
  Submission,
  User,
  UserSource,
} from "./types";

const LOCAL_KEY = "connecting-power-local-v2";
const DEVICE_KEY = "connexts-device-id";
const MY_ID_KEY = "connexts-participant-id";
const LEGACY_KEY = "connecting-power-v1";
const LEGACY_MIGRATED_KEY = "connexts-legacy-migrated";


type LocalState = {
  savedIdeas: string[];
  likedUsers: string[];
  skippedUsers: string[];
  notifications: AppNotification[];
};

type State = {
  me: User | null;
  users: User[];
  ideas: Idea[];
  connections: Connection[];
  commitments: Commitment[];
  provinceNotes: ProvinceNote[];
  submissions: Submission[];
  messages: ChatMessage[];
} & LocalState;

const initial: State = {
  me: null,
  users: [],
  ideas: [],
  connections: [],
  commitments: [],
  provinceNotes: [],
  submissions: [],
  messages: [],
  savedIdeas: [],
  likedUsers: [],
  skippedUsers: [],
  notifications: [],
};

type ProfileInput = Omit<User, "id" | "created_at" | "avatar" | "source"> & {
  avatar?: string;
  source?: UserSource | undefined;
};

type Store = State & {
  hydrated: boolean;
  saveProfile: (u: ProfileInput) => User;
  connect: (otherId: string, score: number, reason: string) => Connection;
  addCommitment: (c: Omit<Commitment, "id" | "created_at">) => Commitment;
  setConnectionStatus: (id: string, status: ConnectionStatus) => void;
  updateCommitment: (
    id: string,
    patch: { follow_up_date?: string | null; status?: ConnectionStatus; description?: string },
  ) => void;
  setRsvp: (id: string, rsvp: Rsvp) => void;
  toggleSaveIdea: (id: string) => void;
  toggleLikeUser: (id: string) => boolean;
  skipUser: (id: string) => void;
  undoSkip: () => void;
  addProvinceNote: (n: Omit<ProvinceNote, "id" | "created_at">) => ProvinceNote;
  addSubmission: (s: Omit<Submission, "id" | "created_at" | "showcase">) => Submission;
  toggleShowcase: (id: string) => void;
  linkAccount: (email: string, userId: string) => void;
  importUsers: (list: User[]) => number;
  updateUser: (id: string, patch: Partial<User>) => void;
  removeUser: (id: string) => void;
  updateIdea: (id: string, patch: Partial<Idea>) => void;
  removeIdea: (id: string) => void;
  updateSubmission: (id: string, patch: Partial<Submission>) => void;
  removeSubmission: (id: string) => void;
  removeProvinceNote: (id: string) => void;
  removeCommitment: (id: string) => void;
  removeConnection: (id: string) => void;
  sendMessage: (connectionId: string, text: string) => ChatMessage;
  markRoomRead: (connectionId: string) => void;
  notify: (n: Omit<AppNotification, "id" | "created_at" | "read">) => AppNotification;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

/* ---------------- helpers ---------------- */

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/**
 * ส่งรหัสอุปกรณ์ไปกับทุกคำขอฐานข้อมูล เพื่อให้ RLS ตรวจสิทธิ์ความเป็นเจ้าของ
 * ของผู้ใช้แบบ guest ได้ (แก้/ลบได้เฉพาะข้อมูลของตัวเองเท่านั้น)
 */
function attachDeviceHeader() {
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rest?.headers?.set?.("x-device-id", getDeviceId());
  } catch {
    /* ignore */
  }
}

/** คอลัมน์สาธารณะของโปรไฟล์ (ไม่ดึง device_id / linked_email / linked_user_id) */
const PARTICIPANT_PUBLIC_COLS =
  "id,name,avatar,photo,province,region,organization,generation,bio,interests,powers_have,powers_need,source,linked_at,created_at,updated_at";

const SUBMISSION_PUBLIC_COLS =
  "id,name,course,batch,region,province,policy_issues,summary,highlight,wanted,photo,stage_ready,showcase,created_at,updated_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function rowToUser(r: Row, myId: string | null): User {
  return {
    id: r.id === myId ? "me" : r.id,
    name: r.name,
    avatar: r.avatar || "✨",
    photo: r.photo ?? undefined,
    province: r.province ?? "",
    region: r.region,
    organization: r.organization ?? "",
    generation: r.generation,
    bio: r.bio ?? "",
    interests: r.interests ?? [],
    powers_have: r.powers_have ?? [],
    powers_need: r.powers_need ?? [],
    created_at: r.created_at,
    updated_at: r.updated_at ?? undefined,
    linked_at: r.linked_at ?? undefined,
    source: (r.source ?? "direct") as UserSource,
  };
}

const idOut = (id: string, myId: string | null) => (id === myId ? "me" : id);

/* ---------------- provider ---------------- */

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);
  const myIdRef = useRef<string | null>(null);
  const localRef = useRef<LocalState>({
    savedIdeas: [],
    likedUsers: [],
    skippedUsers: [],
    notifications: [],
  });

  const refresh = useCallback(async () => {
    attachDeviceHeader();
    const myId = myIdRef.current;
    const [p, i, c, m, msg, sb, pn] = await Promise.all([
      supabase.from("participants").select(PARTICIPANT_PUBLIC_COLS).order("created_at", { ascending: false }),
      supabase.from("ideas").select("*").order("created_at", { ascending: false }),
      supabase.from("connections").select("*").order("created_at", { ascending: false }),
      supabase.from("commitments").select("*").order("created_at", { ascending: false }),
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase.from("submissions").select(SUBMISSION_PUBLIC_COLS).order("created_at", { ascending: false }),
      supabase.from("province_notes").select("*").order("created_at", { ascending: false }),
    ]);

    const users = ((p.data as Row[]) ?? []).map((r) => rowToUser(r, myId));
    const fetchedMe = users.find((u) => u.id === "me") ?? null;
    // ถ้าอ่านฐานข้อมูลไม่ทัน/ไม่สำเร็จ อย่าล้างโปรไฟล์ที่มีอยู่ทิ้ง
    // (เคยทำให้ผู้ใช้ถูกเด้งกลับไปกรอกโปรไฟล์ซ้ำ)
    const keepMe = !fetchedMe && !!myId;

    setState((s) => ({
      ...s,
      me: fetchedMe ?? (keepMe ? s.me : null),
      users: keepMe && s.me ? [s.me, ...users.filter((u) => u.id !== "me")] : users,

      ideas: ((i.data as Row[]) ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? "",
        owner_id: r.owner_id ? idOut(r.owner_id, myId) : "",
        region: r.region,
        issues: r.issues ?? [],
        resources_have: r.resources_have ?? [],
        resources_need: r.resources_need ?? [],
        created_at: r.created_at,
      })),
      connections: ((c.data as Row[]) ?? []).map((r) => ({
        id: r.id,
        user_a: idOut(r.user_a, myId),
        user_b: idOut(r.user_b, myId),
        match_score: r.match_score ?? 0,
        match_reason: r.match_reason ?? "",
        status: r.status as ConnectionStatus,
        created_at: r.created_at,
      })),
      commitments: ((m.data as Row[]) ?? []).map((r) => ({
        id: r.id,
        connection_id: r.connection_id,
        action_type: r.action_type,
        description: r.description ?? "",
        status: r.status as ConnectionStatus,
        follow_up_date: r.follow_up_date ?? null,
        ...(r.rsvp ? { rsvp: r.rsvp as Rsvp } : {}),
        ...(r.partner_rsvp ? { partner_rsvp: r.partner_rsvp as Rsvp } : {}),
        created_at: r.created_at,
      })),
      messages: ((msg.data as Row[]) ?? []).map((r) => ({
        id: r.id,
        connection_id: r.connection_id,
        from_id: r.from_id ? idOut(r.from_id, myId) : "",
        text: r.text,
        created_at: r.created_at,
      })),
      submissions: ((sb.data as Row[]) ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        course: r.course,
        batch: r.batch ?? "",
        region: r.region,
        province: r.province ?? "",
        policy_issues: r.policy_issues ?? [],
        summary: r.summary ?? "",
        highlight: r.highlight ?? "",
        wanted: r.wanted ?? "",
        photo: r.photo ?? undefined,
        stage_ready: !!r.stage_ready,
        showcase: !!r.showcase,
        created_at: r.created_at,
      })),
      provinceNotes: ((pn.data as Row[]) ?? []).map((r) => ({
        id: r.id,
        province: r.province,
        author_id: r.author_id ? idOut(r.author_id, myId) : "",
        author_name: r.author_name ?? "",
        title: r.title,
        detail: r.detail ?? "",
        issues: r.issues ?? [],
        created_at: r.created_at,
      })),
    }));
  }, []);

  // hydrate: local prefs + migrate legacy profile + first load + realtime
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      attachDeviceHeader();
      const local = readLocal<LocalState>(LOCAL_KEY);
      if (local) {
        localRef.current = {
          savedIdeas: local.savedIdeas ?? [],
          likedUsers: local.likedUsers ?? [],
          skippedUsers: local.skippedUsers ?? [],
          notifications: local.notifications ?? [],
        };
        setState((s) => ({ ...s, ...localRef.current }));
      }

      myIdRef.current = localStorage.getItem(MY_ID_KEY);

      // ย้ายโปรไฟล์เดิมที่อยู่ในเครื่อง (Phase 1) ขึ้นฐานข้อมูลกลาง "ครั้งเดียวเท่านั้น"
      // ถ้าไม่กันไว้ จะสร้างโปรไฟล์ซ้ำและชนกับการบันทึกของผู้ใช้ จนถูกเด้งกลับไปกรอกใหม่
      if (!myIdRef.current && localStorage.getItem(LEGACY_MIGRATED_KEY) !== "1") {
        const legacy = readLocal<{ me?: User }>(LEGACY_KEY);
        if (legacy?.me?.name) {
          const id = uuid();
          const { error } = await supabase.from("participants").insert({
            id,
            device_id: getDeviceId(),
            name: legacy.me.name,
            avatar: legacy.me.avatar || "✨",
            photo: legacy.me.photo ?? null,
            province: legacy.me.province ?? "",
            region: legacy.me.region,
            organization: legacy.me.organization ?? "",
            generation: legacy.me.generation,
            bio: legacy.me.bio ?? "",
            interests: legacy.me.interests ?? [],
            powers_have: legacy.me.powers_have ?? [],
            powers_need: legacy.me.powers_need ?? [],
            source: legacy.me.source ?? "direct",
          });
          if (!error) {
            myIdRef.current = id;
            localStorage.setItem(MY_ID_KEY, id);
          }
        }
        try {
          localStorage.setItem(LEGACY_MIGRATED_KEY, "1");
          localStorage.removeItem(LEGACY_KEY);
        } catch {
          /* ignore */
        }
      }


      await refresh();
      if (!cancelled) setHydrated(true);
    };

    void boot();

    const channel = supabase
      .channel("connexts-sync")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  // persist device-local preferences only
  useEffect(() => {
    if (!hydrated) return;
    const local: LocalState = {
      savedIdeas: state.savedIdeas,
      likedUsers: state.likedUsers,
      skippedUsers: state.skippedUsers,
      notifications: state.notifications,
    };
    localRef.current = local;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    } catch {
      /* ignore */
    }
  }, [state.savedIdeas, state.likedUsers, state.skippedUsers, state.notifications, hydrated]);

  const dbId = useCallback((id: string) => (id === "me" ? myIdRef.current ?? id : id), []);

  /* ---------------- actions ---------------- */

  const saveProfile: Store["saveProfile"] = useCallback(
    (data) => {
      const now = new Date().toISOString();
      let resolvedSource = data.source;
      if (!resolvedSource) {
        const session = readLocal<{ source?: UserSource }>("connecting-power-session");
        if (session?.source) resolvedSource = session.source;
      }
      const existingId = myIdRef.current;
      const id = existingId ?? uuid();
      myIdRef.current = id;
      try {
        localStorage.setItem(MY_ID_KEY, id);
      } catch {
        /* ignore */
      }

      const payload = {
        id,
        device_id: getDeviceId(),
        name: data.name,
        avatar: data.avatar || "✨",
        photo: data.photo ?? null,
        province: data.province,
        region: data.region,
        organization: data.organization,
        generation: data.generation,
        bio: data.bio,
        interests: data.interests,
        powers_have: data.powers_have,
        powers_need: data.powers_need,
        source: resolvedSource ?? "direct",
      };

      const saved: User = {
        ...data,
        avatar: payload.avatar,
        id: "me",
        created_at: now,
        updated_at: now,
        source: payload.source as UserSource,
      };

      setState((s) => ({
        ...s,
        me: saved,
        users: [saved, ...s.users.filter((u) => u.id !== "me")],
      }));

      void (async () => {
        await supabase.from("participants").upsert(payload, { onConflict: "id" });
        await refresh();
      })();

      emitLive("match", "พบคู่แมตช์ใหม่", `${saved.name} เข้าร่วมและพร้อมจับคู่พลัง`);
      return saved;
    },
    [refresh],
  );

  const linkAccount: Store["linkAccount"] = useCallback(
    (email, userId) => {
      const id = myIdRef.current;
      if (!id) return;
      const now = new Date().toISOString();
      setState((s) => ({
        ...s,
        me: s.me ? { ...s.me, linked_email: email, linked_user_id: userId, linked_at: now } : s.me,
      }));
      void (async () => {
        await supabase
          .from("participants")
          .update({ linked_email: email, linked_user_id: userId, linked_at: now })
          .eq("id", id);
        await refresh();
      })();
    },
    [refresh],
  );

  const connect: Store["connect"] = useCallback(
    (otherId, score, reason) => {
      const myId = myIdRef.current;
      const conn: Connection = {
        id: uuid(),
        user_a: "me",
        user_b: otherId,
        match_score: score,
        match_reason: reason,
        status: "Connected",
        created_at: new Date().toISOString(),
      };

      setState((s) => {
        const existing = s.connections.find(
          (c) =>
            (c.user_a === "me" && c.user_b === otherId) || (c.user_b === "me" && c.user_a === otherId),
        );
        if (existing) return s;
        const name = s.users.find((u) => u.id === otherId)?.name ?? "เพื่อนใหม่";
        const sent: AppNotification = {
          id: uuid(),
          kind: "connect_sent",
          title: "ส่งคำขอเชื่อมแล้ว",
          body: `กำลังส่งสัญญาณถึง ${name}…`,
          from_id: otherId,
          from_name: name,
          connection_id: conn.id,
          read: false,
          created_at: new Date().toISOString(),
        };
        emitLive("connect", "เชื่อมต่อใหม่", `คุณ ↔ ${name} · แมตช์ ${score}%`);
        return { ...s, connections: [conn, ...s.connections], notifications: [sent, ...s.notifications] };
      });

      if (myId) {
        void (async () => {
          await supabase.from("connections").insert({
            id: conn.id,
            user_a: myId,
            user_b: otherId,
            match_score: score,
            match_reason: reason,
            status: "Connected",
          });
          await refresh();
        })();
      }
      return conn;
    },
    [refresh],
  );

  const addCommitment: Store["addCommitment"] = useCallback(
    (c) => {
      const item: Commitment = { ...c, id: uuid(), created_at: new Date().toISOString() };
      setState((s) => {
        const conn = s.connections.find((x) => x.id === c.connection_id);
        const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
        const name = s.users.find((u) => u.id === otherId)?.name ?? "เพื่อนร่วมงาน";
        const note: AppNotification = {
          id: uuid(),
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

      void (async () => {
        await supabase.from("commitments").insert({
          id: item.id,
          connection_id: item.connection_id,
          action_type: item.action_type,
          description: item.description,
          status: item.status,
          follow_up_date: item.follow_up_date,
          rsvp: item.rsvp ?? null,
        });
        await supabase.from("connections").update({ status: item.status }).eq("id", item.connection_id);
        await refresh();
      })();
      return item;
    },
    [refresh],
  );

  const setConnectionStatus: Store["setConnectionStatus"] = useCallback(
    (id, status) => {
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
      void (async () => {
        await supabase.from("connections").update({ status }).eq("id", id);
        await supabase.from("commitments").update({ status }).eq("connection_id", id);
        await refresh();
      })();
    },
    [refresh],
  );

  const updateCommitment: Store["updateCommitment"] = useCallback(
    (id, patch) => {
      setState((s) => {
        const target = s.commitments.find((m) => m.id === id);
        if (!target) return s;
        const conn = s.connections.find((c) => c.id === target.connection_id);
        const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
        const name = s.users.find((u) => u.id === otherId)?.name ?? "เพื่อนร่วมงาน";
        if (patch.follow_up_date) {
          emitLive(
            "commitment",
            "เสนอวันเวลานัดหมาย",
            `${name} · ${new Date(patch.follow_up_date).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`,
          );
        } else if (patch.status) {
          emitLive("commitment", "อัปเดตสถานะคำมั่นสัญญา", `${name} · ${patch.status}`);
        }
        return {
          ...s,
          commitments: s.commitments.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          connections: patch.status
            ? s.connections.map((c) =>
                c.id === target.connection_id ? { ...c, status: patch.status! } : c,
              )
            : s.connections,
        };
      });
      void (async () => {
        await supabase.from("commitments").update(patch).eq("id", id);
        await refresh();
      })();
    },
    [refresh],
  );

  const setRsvp: Store["setRsvp"] = useCallback(
    (id, rsvp) => {
      setState((s) => {
        const target = s.commitments.find((m) => m.id === id);
        if (!target) return s;
        const conn = s.connections.find((c) => c.id === target.connection_id);
        const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
        const name = s.users.find((u) => u.id === otherId)?.name ?? "เพื่อนร่วมงาน";
        emitLive(
          "commitment",
          rsvp === "accepted" ? "ตอบรับนัดหมาย ✅" : "แจ้งไม่สะดวก ❌",
          `${name} · ${target.action_type}`,
        );
        return { ...s, commitments: s.commitments.map((m) => (m.id === id ? { ...m, rsvp } : m)) };
      });
      void (async () => {
        await supabase.from("commitments").update({ rsvp }).eq("id", id);
        await refresh();
      })();
    },
    [refresh],
  );

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

  const addProvinceNote: Store["addProvinceNote"] = useCallback(
    (n) => {
      const note: ProvinceNote = { ...n, id: uuid(), created_at: new Date().toISOString() };
      setState((s) => ({ ...s, provinceNotes: [note, ...s.provinceNotes] }));
      void (async () => {
        await supabase.from("province_notes").insert({
          id: note.id,
          province: note.province,
          author_id: note.author_id === "me" ? myIdRef.current : note.author_id || null,
          author_name: note.author_name,
          title: note.title,
          detail: note.detail,
          issues: note.issues,
        });
        await refresh();
      })();
      return note;
    },
    [refresh],
  );

  const addSubmission: Store["addSubmission"] = useCallback(
    (data) => {
      const item: Submission = {
        ...data,
        showcase: false,
        id: uuid(),
        created_at: new Date().toISOString(),
      };
      setState((s) => ({ ...s, submissions: [item, ...s.submissions] }));
      void (async () => {
        await supabase.from("submissions").insert({
          id: item.id,
          name: item.name,
          course: item.course,
          batch: item.batch,
          region: item.region,
          province: item.province,
          policy_issues: item.policy_issues,
          summary: item.summary,
          highlight: item.highlight,
          wanted: item.wanted,
          photo: item.photo ?? null,
          stage_ready: item.stage_ready,
          showcase: false,
          device_id: getDeviceId(),
        });
        await refresh();
      })();
      return item;
    },
    [refresh],
  );

  const toggleShowcase: Store["toggleShowcase"] = useCallback(
    (id) => {
      let next = false;
      setState((s) => {
        next = !s.submissions.find((x) => x.id === id)?.showcase;
        return {
          ...s,
          submissions: s.submissions.map((x) => (x.id === id ? { ...x, showcase: !x.showcase } : x)),
        };
      });
      void (async () => {
        await supabase.from("submissions").update({ showcase: next }).eq("id", id);
        await refresh();
      })();
    },
    [refresh],
  );

  const importUsers: Store["importUsers"] = useCallback(
    (list) => {
      const rows = list.map((u) => ({
        id: uuid(),
        name: u.name,
        avatar: u.avatar || "✨",
        photo: u.photo ?? null,
        province: u.province ?? "",
        region: u.region,
        organization: u.organization ?? "",
        generation: u.generation,
        bio: u.bio ?? "",
        interests: u.interests ?? [],
        powers_have: u.powers_have ?? [],
        powers_need: u.powers_need ?? [],
        source: u.source ?? "admin",
      }));
      void (async () => {
        if (rows.length) await supabase.from("participants").insert(rows);
        await refresh();
      })();
      return list.length;
    },
    [refresh],
  );

  const updateUser: Store["updateUser"] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) =>
          u.id === id ? { ...u, ...patch, updated_at: new Date().toISOString() } : u,
        ),
        me: s.me && s.me.id === id ? { ...s.me, ...patch } : s.me,
      }));
      const { id: _ignored, created_at: _c, ...rest } = patch as Partial<User> & { id?: string };
      void (async () => {
        const target = dbId(id);
        const { error } = await supabase.from("participants").update(rest as Row).eq("id", target);
        const pwd = adminPassword();
        if (pwd) {
          await adminUpdateRow({
            data: { password: pwd, table: "participants", id: target, patch: rest as Row },
          }).catch(() => undefined);
        } else if (error) {
          console.warn("[store] update participant failed", error.message);
        }
        await refresh();
      })();
    },
    [refresh, dbId],
  );

  const removeRow = useCallback(
    (table: AdminTable, id: string) => {
      void (async () => {
        const { error } = await supabase.from(table as never).delete().eq("id", id);
        const pwd = adminPassword();
        // ผู้ดูแลหลังบ้านลบข้อมูลของคนอื่นได้ผ่านสิทธิ์ฝั่งเซิร์ฟเวอร์
        if (pwd) {
          await adminDeleteRow({ data: { password: pwd, table, id } }).catch((e) =>
            console.warn("[store] admin delete failed", e),
          );
        } else if (error) {
          console.warn("[store] delete failed", error.message);
        }
        await refresh();
      })();
    },
    [refresh],
  );


  const removeUser: Store["removeUser"] = useCallback(
    (id) => {
      setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) }));
      removeRow("participants", dbId(id));
    },
    [removeRow, dbId],
  );

  const updateIdea: Store["updateIdea"] = useCallback(
    (id, patch) => {
      setState((s) => ({ ...s, ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
      void (async () => {
        const { id: _i, created_at: _c, owner_id, ...rest } = patch as Row;
        const payload: Row = { ...rest };
        if (owner_id !== undefined) payload["owner_id"] = owner_id ? dbId(owner_id) : null;
        await supabase.from("ideas").update(payload).eq("id", id);
        await refresh();
      })();
    },
    [refresh, dbId],
  );

  const removeIdea: Store["removeIdea"] = useCallback(
    (id) => {
      setState((s) => ({ ...s, ideas: s.ideas.filter((i) => i.id !== id) }));
      removeRow("ideas", id);
    },
    [removeRow],
  );

  const updateSubmission: Store["updateSubmission"] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        submissions: s.submissions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
      void (async () => {
        const { id: _i, created_at: _c, ...rest } = patch as Row;
        await supabase.from("submissions").update(rest).eq("id", id);
        await refresh();
      })();
    },
    [refresh],
  );

  const removeSubmission: Store["removeSubmission"] = useCallback(
    (id) => {
      setState((s) => ({ ...s, submissions: s.submissions.filter((x) => x.id !== id) }));
      removeRow("submissions", id);
    },
    [removeRow],
  );

  const removeProvinceNote: Store["removeProvinceNote"] = useCallback(
    (id) => {
      setState((s) => ({ ...s, provinceNotes: s.provinceNotes.filter((n) => n.id !== id) }));
      removeRow("province_notes", id);
    },
    [removeRow],
  );

  const removeCommitment: Store["removeCommitment"] = useCallback(
    (id) => {
      setState((s) => ({ ...s, commitments: s.commitments.filter((c) => c.id !== id) }));
      removeRow("commitments", id);
    },
    [removeRow],
  );

  const removeConnection: Store["removeConnection"] = useCallback(
    (id) => {
      setState((s) => ({
        ...s,
        connections: s.connections.filter((c) => c.id !== id),
        commitments: s.commitments.filter((c) => c.connection_id !== id),
      }));
      removeRow("connections", id);
    },
    [removeRow],
  );

  const sendMessage: Store["sendMessage"] = useCallback(
    (connectionId, text) => {
      const body = text.trim();
      const msg: ChatMessage = {
        id: uuid(),
        connection_id: connectionId,
        from_id: "me",
        text: body,
        created_at: new Date().toISOString(),
      };
      if (!body) return msg;
      setState((s) => {
        const conn = s.connections.find((c) => c.id === connectionId);
        const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
        const name = s.users.find((u) => u.id === otherId)?.name ?? "เพื่อนร่วมงาน";
        emitLive("message", "ข้อความใหม่", `คุณ → ${name}: ${body.slice(0, 40)}`);
        return { ...s, messages: [...s.messages, msg] };
      });
      void (async () => {
        await supabase.from("messages").insert({
          id: msg.id,
          connection_id: connectionId,
          from_id: myIdRef.current,
          text: body,
        });
        await refresh();
      })();
      return msg;
    },
    [refresh],
  );

  const markRoomRead: Store["markRoomRead"] = useCallback((connectionId) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.kind === "message" && n.connection_id === connectionId ? { ...n, read: true } : n,
      ),
    }));
  }, []);

  const notify: Store["notify"] = useCallback((n) => {
    const item: AppNotification = { ...n, id: uuid(), read: false, created_at: new Date().toISOString() };
    setState((s) => ({ ...s, notifications: [item, ...s.notifications] }));
    return item;
  }, []);

  const markNotificationsRead: Store["markNotificationsRead"] = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const clearNotifications: Store["clearNotifications"] = useCallback(() => {
    setState((s) => ({ ...s, notifications: [] }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, savedIdeas: [], likedUsers: [], skippedUsers: [], notifications: [] }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...state,
      hydrated,
      saveProfile,
      connect,
      addCommitment,
      setConnectionStatus,
      updateCommitment,
      setRsvp,
      toggleSaveIdea,
      toggleLikeUser,
      skipUser,
      undoSkip,
      addProvinceNote,
      addSubmission,
      toggleShowcase,
      linkAccount,
      importUsers,
      updateUser,
      removeUser,
      updateIdea,
      removeIdea,
      updateSubmission,
      removeSubmission,
      removeProvinceNote,
      removeCommitment,
      removeConnection,
      sendMessage,
      markRoomRead,
      notify,
      markNotificationsRead,
      clearNotifications,
      reset,
    }),
    [state, hydrated, saveProfile, connect, addCommitment, setConnectionStatus, updateCommitment, setRsvp, toggleSaveIdea, toggleLikeUser, skipUser, undoSkip, addProvinceNote, addSubmission, toggleShowcase, linkAccount, importUsers, updateUser, removeUser, updateIdea, removeIdea, updateSubmission, removeSubmission, removeProvinceNote, removeCommitment, removeConnection, sendMessage, markRoomRead, notify, markNotificationsRead, clearNotifications, reset],
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
