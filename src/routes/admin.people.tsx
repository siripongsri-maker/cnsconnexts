import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Search,
  Save,
  Trash2,
  FileUp,
  Filter,
  Download,
  Eye,
  X,
  Sparkles,
  Check,
  Link2,
  CalendarCheck,
  CircleAlert,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAdminTitleNote } from "@/components/admin/page-head";
import { useStore } from "@/lib/store";
import { PROVINCES } from "@/lib/thailand-geo";
import { ISSUES, type Region, type UserSource } from "@/lib/types";
import { issueTh, powerTh, provinceTh, REGION_LABEL, STATUS_TH, GENERATION_TH } from "@/lib/i18n";
import { rankMatches } from "@/lib/matching";
import { POWER_EMOJI } from "@/lib/types";
import { downloadCSV, type Row } from "@/lib/export";
import type { User, Connection, Commitment, ConnectionStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/people")({
  head: () => ({
    meta: [
      { title: "จัดการข้อมูลสมาชิก — คนส. Connexts" },
      {
        name: "description",
        content:
          "หน้าผู้ดูแลสำหรับแก้ไขชื่อ องค์กร คำอธิบาย จังหวัด และแท็กความสนใจของสมาชิกแบบรวดเร็ว",
      },
      { property: "og:title", content: "จัดการข้อมูลสมาชิก — คนส. Connexts" },
      { property: "og:description", content: "แก้ไขข้อมูลเดโม่ของสมาชิกได้ในหน้าเดียว" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPeoplePage,
});

type Draft = Pick<User, "name" | "organization" | "bio" | "province" | "interests">;

/** Phase 2: ไม่มีข้อมูลเดโม่แล้ว ผู้ใช้ทุกคนคือผู้ใช้จริง */
const isDemo = (_id: string) => false;

/** Status chip colours: BLOCK_TAG pairs (--tag-*-bg in admin-pages.css). The Thai status word always sits inside the chip. */
const STATUS_TAG: Record<ConnectionStatus, string> = {
  Connected: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-fg)]",
  Planning: "bg-[var(--tag-yellow-bg)] text-[var(--tag-yellow-fg)]",
  "In Progress": "bg-[var(--tag-orange-bg)] text-[var(--tag-orange-fg)]",
  Completed: "bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]",
};

type SourceFilter = "all" | "real" | UserSource;

const SOURCE_LABEL: Record<SourceFilter, string> = {
  all: "ทั้งหมด",
  real: "ผู้ใช้จริง",
  demo: "เดโม่",
  qr: "QR",
  link: "ลิงก์",
  invite: "Invite",
  direct: "เข้าตรง",
  auth: "บัญชี",
  admin: "นำเข้า",
};

/** สถานะความสมบูรณ์ของโปรไฟล์ (ครบ / ยังไม่ครบ) */
function profileStatus(u: User) {
  const missing: string[] = [];
  if (!u.bio?.trim()) missing.push("คำอธิบาย");
  if (!u.interests?.length) missing.push("ความสนใจ");
  if (!u.powers_have?.length) missing.push("พลังที่มี");
  if (!u.powers_need?.length) missing.push("พลังที่ต้องการ");
  if (!u.photo) missing.push("รูปโปรไฟล์");
  const total = 5;
  const percent = Math.round(((total - missing.length) / total) * 100);
  return { missing, percent, label: missing.length === 0 ? "ครบถ้วน" : "ยังไม่ครบ" };
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

function toRows(list: User[]): Row[] {
  return list.map((u) => {
    const st = profileStatus(u);
    return {
      id: u.id,
      ชื่อ: u.name,
      องค์กร: u.organization,
      จังหวัด: provinceTh(u.province),
      ภูมิภาค: REGION_LABEL[u.region],
      เจเนอเรชัน: u.generation,
      วันที่onboard: fmtDate(u.created_at),
      เวลาonboard: u.created_at,
      อัปเดตล่าสุด: u.updated_at ? fmtDate(u.updated_at) : "",
      แหล่งที่มา: SOURCE_LABEL[(u.source ?? "direct") as SourceFilter],
      ผูกบัญชีอีเมล: u.linked_at ? "ผูกแล้ว" : "ยังไม่ผูก",
      สถานะโปรไฟล์: st.label,
      ความครบถ้วน: `${st.percent}%`,
      ข้อมูลที่ขาด: st.missing.join(" / "),
      ความสนใจ: u.interests.map(issueTh).join(" / "),
      พลังที่มี: u.powers_have.join(" / "),
      พลังที่ต้องการ: u.powers_need.join(" / "),
      คำอธิบาย: u.bio,
    };
  });
}

function AdminPeoplePage() {
  const { users, updateUser, removeUser, connections, commitments } = useStore();
  const [q, setQ] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return users.filter((u) => {
      if (source !== "all" && source !== "real" && u.source !== source) return false;
      if (fromTs !== null || toTs !== null) {
        const ts = new Date(u.created_at).getTime();
        if (Number.isNaN(ts)) return false;
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }
      if (!t) return true;
      return [u.name, u.organization, u.bio, provinceTh(u.province), ...u.interests.map(issueTh)]
        .join(" ")
        .toLowerCase()
        .includes(t);
    });
  }, [users, q, source, from, to]);

  const realCount = users.filter((u) => !isDemo(u.id)).length;
  useAdminTitleNote(
    filtered.length === users.length
      ? `(${users.length})`
      : `(${filtered.length} จาก ${users.length})`,
  );
  const detailUser = useMemo(() => users.find((u) => u.id === detailId) ?? null, [users, detailId]);

  const open = (u: User) => {
    setOpenId(u.id);
    setDraft({
      name: u.name,
      organization: u.organization,
      bio: u.bio,
      province: u.province,
      interests: [...u.interests],
    });
  };

  const save = (u: User) => {
    if (!draft) return;
    const shape = PROVINCES.find((p) => p.en === draft.province);
    updateUser(u.id, {
      ...draft,
      name: draft.name.trim() || u.name,
      region: (shape?.region ?? u.region) as Region,
    });
    toast.success(`บันทึกข้อมูล “${draft.name.trim() || u.name}” แล้ว`);
    setOpenId(null);
    setDraft(null);
  };

  const toggleInterest = (key: string) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            interests: d.interests.includes(key)
              ? d.interests.filter((i) => i !== key)
              : [...d.interests, key],
          }
        : d,
    );
  };

  return (
    <AppShell title="สมาชิก">
      <div className="admin-workspace admin-workspace-people space-y-4">
        <div className="admin-people-toolbar">
          <label className="admin-people-search">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">ค้นหาสมาชิก</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อ องค์กร จังหวัด หรือประเด็น"
              className="w-full bg-transparent text-body placeholder:text-muted-foreground"
            />
          </label>
          <div className="admin-segmented flex rounded-xl bg-muted p-0.5">
            {(["all", "real"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`tap rounded-lg px-3 py-1.5 text-body font-semibold ${
                  source === s ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {SOURCE_LABEL[s]} ({s === "real" ? realCount : users.length})
              </button>
            ))}
          </div>
          <label className="admin-people-source relative">
            <span className="sr-only">แหล่งที่มา</span>
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as SourceFilter)}
              className="w-full appearance-none rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-body"
            >
              <option value="all">ทุกแหล่งที่มา</option>
              <option value="real">ผู้ใช้จริง</option>
              <option value="qr">QR</option>
              <option value="link">ลิงก์</option>
              <option value="invite">Invite</option>
              <option value="direct">เข้าตรง</option>
              <option value="auth">บัญชี</option>
              <option value="admin">นำเข้า</option>
            </select>
          </label>
          <div className="admin-people-dates">
            <label className="flex items-center gap-2">
              <span className="text-body text-muted-foreground">เข้าร่วมตั้งแต่</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-body"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-body text-muted-foreground">ถึง</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-body"
              />
            </label>
          </div>
          {(source !== "all" || from || to || q) && (
            <button
              type="button"
              onClick={() => {
                setSource("all");
                setFrom("");
                setTo("");
                setQ("");
              }}
              className="text-body font-semibold text-primary"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
          <div className="admin-people-actions">
            <button
              type="button"
              onClick={() => {
                const real = users.filter((u) => !isDemo(u.id));
                if (!real.length) {
                  toast.error("ยังไม่มีผู้ใช้จริงให้ส่งออก");
                  return;
                }
                downloadCSV("connexts-real-users", toRows(real));
                toast.success(`ส่งออกผู้ใช้จริง ${real.length} คนแล้ว`);
              }}
              className="tap inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-body font-semibold text-foreground"
            >
              <Download className="size-4" aria-hidden="true" /> CSV ผู้ใช้จริง ({realCount})
            </button>
            <button
              type="button"
              onClick={() => {
                if (!filtered.length) {
                  toast.error("ไม่มีรายการตามตัวกรอง");
                  return;
                }
                downloadCSV("connexts-people-filtered", toRows(filtered));
                toast.success(`ส่งออก ${filtered.length} รายการแล้ว`);
              }}
              className="tap inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-body font-semibold text-foreground"
            >
              <Download className="size-4" aria-hidden="true" /> CSV ตามตัวกรอง ({filtered.length})
            </button>
            <Link
              to="/admin/import"
              className="tap inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-body font-semibold text-foreground"
            >
              <FileUp className="size-4" aria-hidden="true" /> นำเข้า CSV
            </Link>
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-body text-muted-foreground">
            ไม่พบสมาชิกที่ตรงกับคำค้น
          </p>
        )}

        {filtered.length > 0 && (
          <div className="admin-people-head" aria-hidden="true">
            <span>ชื่อ</span>
            <span>องค์กร · จังหวัด</span>
            <span>แหล่งที่มา</span>
            <span>โปรไฟล์</span>
          </div>
        )}
        <ul className="admin-people-records">
          {filtered.map((u) => {
            const editing = openId === u.id && draft;
            const st = profileStatus(u);
            return (
              <li key={u.id} className={editing ? "admin-people-editing" : "admin-people-row"}>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => open(u)}
                    className="admin-people-summary text-left"
                  >
                    <span className="admin-people-avatar" aria-hidden="true">
                      {u.avatar}
                    </span>
                    <span className="admin-people-name">{u.name}</span>
                    <span className="admin-people-org">
                      {u.organization} · {provinceTh(u.province)} · {REGION_LABEL[u.region]}
                    </span>
                    <span className="admin-people-source-cell">
                      <SourceBadge source={u.source} />
                    </span>
                    <span className="admin-people-status">
                      {st.missing.length ? (
                        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
                      )}
                      {st.label}
                    </span>
                  </button>
                ) : null}
                {!editing && (
                  <div className="admin-people-row-actions">
                    <button
                      type="button"
                      onClick={() => setDetailId(u.id)}
                      className="tap inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-body font-semibold"
                    >
                      <Eye className="size-4" aria-hidden="true" /> ดูรายละเอียด
                    </button>
                    <button
                      type="button"
                      onClick={() => open(u)}
                      className="tap inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body font-semibold text-muted-foreground"
                    >
                      แก้ไข
                    </button>
                  </div>
                )}
                {editing && (
                  <div className="space-y-3">
                    <Field label="ชื่อ">
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                      />
                    </Field>
                    <Field label="องค์กร">
                      <input
                        value={draft.organization}
                        onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                      />
                    </Field>
                    <Field label="จังหวัด">
                      <select
                        value={draft.province}
                        onChange={(e) => setDraft({ ...draft, province: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                      >
                        {PROVINCES.map((p) => (
                          <option key={p.en} value={p.en}>
                            {p.th}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="คำอธิบาย">
                      <textarea
                        rows={3}
                        value={draft.bio}
                        onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                      />
                    </Field>
                    <Field label="แท็กความสนใจ">
                      <div className="flex flex-wrap gap-1.5">
                        {ISSUES.map((i) => {
                          const on = draft.interests.includes(i);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => toggleInterest(i)}
                              className={`tap inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-body ${
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {on && <Check className="size-4" aria-hidden="true" />}
                              {issueTh(i)}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => save(u)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body font-semibold text-primary-foreground"
                      >
                        <Save className="size-4" /> บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenId(null);
                          setDraft(null);
                        }}
                        className="rounded-xl border border-border px-4 py-2 text-body"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(`ลบ “${u.name}” ออกจากข้อมูลเดโม่?`)) return;
                          removeUser(u.id);
                          setOpenId(null);
                          setDraft(null);
                          toast.success("ลบสมาชิกแล้ว");
                        }}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-2 text-body text-destructive"
                      >
                        <Trash2 className="size-4" /> ลบ
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {detailUser && (
        <UserDetail
          user={detailUser}
          users={users}
          connections={connections}
          commitments={commitments}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setDetailId(null);
            open(detailUser);
          }}
        />
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-body font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SourceBadge({ source }: { source?: UserSource | undefined }) {
  const label = source ? SOURCE_LABEL[source] : "เข้าตรง";
  // Neutral chip: the source is not a record type, so it carries no block colour (colour = record type in admin).
  return (
    <span className="admin-source-chip rounded-full border border-border px-2 py-0.5 text-body">
      {label}
    </span>
  );
}

/** แผงรายละเอียดผู้ใช้: โปรไฟล์พลัง · ความสนใจ · แมตช์ · การเชื่อมต่อ · commitment */
function UserDetail({
  user,
  users,
  connections,
  commitments,
  onClose,
  onEdit,
}: {
  user: User;
  users: User[];
  connections: Connection[];
  commitments: Commitment[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const closeTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const titleId = useId();

  const requestClose = useCallback((afterClose?: () => void) => {
    if (closingRef.current) return;
    const complete = afterClose ?? closeRef.current;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.hasAttribute("data-lowspec");
    if (reduced) {
      complete();
      return;
    }
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(complete, 180);
  }, []);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const panel = panelRef.current;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [requestClose]);

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const st = profileStatus(user);

  const matches = useMemo(
    () =>
      rankMatches(
        user,
        users.filter((u) => u.id !== user.id),
        5,
      ),
    [user, users],
  );
  const myConnections = useMemo(
    () => connections.filter((c) => c.user_a === user.id || c.user_b === user.id),
    [connections, user.id],
  );
  const myCommitments = useMemo(() => {
    const ids = new Set(myConnections.map((c) => c.id));
    return commitments.filter((m) => ids.has(m.connection_id));
  }, [commitments, myConnections]);

  return (
    <div
      className={`admin-person-overlay${closing ? " is-closing" : ""} fixed inset-0 z-50 flex justify-center bg-foreground/40 backdrop-blur-sm`}
      data-motion-local="true"
      data-lenis-prevent
      onClick={() => requestClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="admin-person-detail mt-10 w-full overflow-y-auto rounded-t-3xl border border-border bg-card pb-24 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-5 py-3">
          <span className="text-2xl leading-none">{user.avatar}</span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="break-words text-title font-bold">
              {user.name}
            </h2>
            <p className="break-words text-body text-muted-foreground">
              {user.organization} · {provinceTh(user.province)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => requestClose()}
            aria-label="ปิดรายละเอียดสมาชิก"
            className="tap grid size-11 place-items-center rounded-lg text-muted-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={user.source} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-body font-bold">
              {GENERATION_TH[user.generation] ?? user.generation}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-body font-bold">
              {REGION_LABEL[user.region]}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-body font-bold ${
                st.missing.length
                  ? "bg-[var(--tag-orange-bg)] text-[var(--tag-orange-fg)]"
                  : "bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]"
              }`}
            >
              {st.missing.length ? (
                <CircleAlert className="size-4" aria-hidden="true" />
              ) : (
                <CircleCheck className="size-4" aria-hidden="true" />
              )}
              โปรไฟล์ {st.label} {st.percent}%
            </span>
          </div>

          <Section icon={<Sparkles className="size-4" />} title="โปรไฟล์พลัง">
            <div className="grid gap-2">
              <PowerList
                label="พลังที่มี"
                items={user.powers_have}
                tone="bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]"
              />
              <PowerList
                label="พลังที่ต้องการ"
                items={user.powers_need}
                tone="bg-[var(--tag-orange-bg)] text-[var(--tag-orange-fg)]"
              />
            </div>
            {user.bio && <p className="mt-2 text-body text-muted-foreground">{user.bio}</p>}
            <p className="mt-2 text-body text-muted-foreground">
              เข้าร่วมเมื่อ {fmtDate(user.created_at)}
              {user.updated_at ? ` · อัปเดต ${fmtDate(user.updated_at)}` : ""}
              {user.linked_at ? " · ผูกบัญชีอีเมลแล้ว" : ""}
            </p>
            {st.missing.length > 0 && (
              <p className="mt-1 text-body text-coral-ink">
                ข้อมูลที่ยังขาด: {st.missing.join(" / ")}
              </p>
            )}
          </Section>

          <Section icon={<Sparkles className="size-4" />} title="ความสนใจ">
            <div className="flex flex-wrap gap-1.5">
              {user.interests.length ? (
                user.interests.map((i) => (
                  <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-body">
                    {issueTh(i)}
                  </span>
                ))
              ) : (
                <Empty text="ยังไม่ได้เลือกความสนใจ" />
              )}
            </div>
          </Section>

          <Section
            icon={<Sparkles className="size-4" />}
            title={`คู่แมตช์แนะนำ (${matches.length})`}
          >
            {matches.length ? (
              <ul className="space-y-2">
                {matches.map((m) => (
                  <li key={m.user.id} className="rounded-xl border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{m.user.avatar}</span>
                      <span className="min-w-0 flex-1 break-words text-body font-semibold">
                        {m.user.name}
                      </span>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-body font-bold text-primary">
                        {Math.round(m.score)}%
                      </span>
                    </div>
                    <p className="mt-1 text-body text-muted-foreground">{m.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="ยังไม่มีคู่แมตช์" />
            )}
          </Section>

          <Section
            icon={<Link2 className="size-4" />}
            title={`การเชื่อมต่อ (${myConnections.length})`}
          >
            {myConnections.length ? (
              <ul className="space-y-2">
                {myConnections.map((c) => {
                  const other = c.user_a === user.id ? c.user_b : c.user_a;
                  return (
                    <li key={c.id} className="rounded-xl border border-border p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 break-words text-body font-semibold">
                          กับ {nameOf(other)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-body font-bold ${STATUS_TAG[c.status] ?? "bg-muted text-foreground"}`}
                        >
                          {STATUS_TH[c.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-body text-muted-foreground">
                        คะแนน {Math.round(c.match_score)}% · {c.match_reason}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty text="ยังไม่มีการเชื่อมต่อ" />
            )}
          </Section>

          <Section
            icon={<CalendarCheck className="size-4" />}
            title={`คำมั่นสัญญา (${myCommitments.length})`}
          >
            {myCommitments.length ? (
              <ul className="space-y-2">
                {myCommitments.map((m) => (
                  <li key={m.id} className="rounded-xl border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 break-words text-body font-semibold">
                        {m.action_type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-body font-bold ${STATUS_TAG[m.status] ?? "bg-muted text-foreground"}`}
                      >
                        {STATUS_TH[m.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-body text-muted-foreground">{m.description}</p>
                    {m.follow_up_date && (
                      <p className="mt-0.5 text-body text-primary">
                        นัดหมาย {fmtDate(m.follow_up_date)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="ยังไม่มีคำมั่นสัญญา" />
            )}
          </Section>

          <button
            type="button"
            onClick={() => requestClose(onEdit)}
            className="tap w-full rounded-xl bg-primary py-2.5 text-body font-semibold text-primary-foreground"
          >
            แก้ไขข้อมูลผู้ใช้นี้
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-lead font-bold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function PowerList({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  return (
    <div>
      <p className="text-body font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.length ? (
          items.map((p) => (
            <span key={p} className={`rounded-full px-2.5 py-1 text-body ${tone}`}>
              {POWER_EMOJI[p] ?? "✨"} {powerTh(p)}
            </span>
          ))
        ) : (
          <Empty text="—" />
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <span className="text-body text-muted-foreground">{text}</span>;
}
