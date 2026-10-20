import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Search,
  Save,
  Trash2,
  Users,
  FileUp,
  Filter,
  Download,
  Eye,
  X,
  Sparkles,
  Link2,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { PROVINCES } from "@/lib/thailand-geo";
import { ISSUES, type Region, type UserSource } from "@/lib/types";
import { issueTh, powerTh, provinceTh, REGION_LABEL, STATUS_TH, GENERATION_TH } from "@/lib/i18n";
import { rankMatches } from "@/lib/matching";
import { POWER_EMOJI } from "@/lib/types";
import { downloadCSV, type Row } from "@/lib/export";
import type { User, Connection, Commitment } from "@/lib/types";

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
        <div className="admin-section-meta">
          <span>ทำเนียบสมาชิก</span>
          <span>
            {filtered.length} / {users.length} คน
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ องค์กร จังหวัด หรือประเด็น"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="admin-people-filters space-y-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex rounded-xl bg-muted p-0.5">
            {(["all", "real"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`tap flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  source === s ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {SOURCE_LABEL[s]}
                {s === "real" ? ` (${realCount})` : ""}
              </button>
            ))}
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">แหล่งที่มา</span>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as SourceFilter)}
                className="w-full appearance-none rounded-xl border border-border bg-background py-2 pl-8 pr-3 text-xs outline-none"
              >
                <option value="all">ทั้งหมด</option>
                <option value="real">ผู้ใช้จริง</option>
                <option value="qr">QR</option>
                <option value="link">ลิงก์</option>
                <option value="invite">Invite</option>
                <option value="direct">เข้าตรง</option>
                <option value="auth">บัญชี</option>
                <option value="admin">นำเข้า</option>
              </select>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">onboard ตั้งแต่</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">ถึงวันที่</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
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
              className="text-xs font-semibold text-primary"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        <div className="admin-people-export space-y-2 rounded-2xl border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            ส่งออกข้อมูล (CSV รองรับภาษาไทย)
          </p>
          <div className="grid grid-cols-2 gap-2">
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
              className="tap inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Download className="size-3.5" /> ผู้ใช้จริง ({realCount})
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
              className="tap inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
            >
              <Download className="size-3.5" /> ตามตัวกรอง ({filtered.length})
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            รวมข้อมูลโปรไฟล์ ความสนใจ และพลังที่มี / ต้องการ
          </p>
        </div>

        <Link
          to="/admin/import"
          className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
        >
          <FileUp className="size-4" /> นำเข้ารายชื่อเพิ่มจากไฟล์ CSV
        </Link>

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            ไม่พบสมาชิกที่ตรงกับคำค้น
          </p>
        )}

        <ul className="admin-records admin-people-records space-y-3">
          {filtered.map((u) => {
            const editing = openId === u.id && draft;
            return (
              <li key={u.id} className="rounded-2xl border border-border bg-card p-4">
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => open(u)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span className="text-2xl leading-none">{u.avatar}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block break-words text-sm font-semibold">{u.name}</span>
                        <SourceBadge source={u.source} />
                      </span>
                      <span className="block break-words text-xs text-muted-foreground">
                        {u.organization} · {provinceTh(u.province)} · {REGION_LABEL[u.region]}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                        {u.bio}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {u.interests.slice(0, 4).map((i) => (
                          <span
                            key={i}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {issueTh(i)}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                ) : null}
                {!editing && (
                  <div className="mt-2 flex gap-2 border-t border-border pt-2">
                    <button
                      type="button"
                      onClick={() => setDetailId(u.id)}
                      className="tap inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold"
                    >
                      <Eye className="size-3.5" /> ดูรายละเอียด
                    </button>
                    <button
                      type="button"
                      onClick={() => open(u)}
                      className="tap inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                    >
                      แก้ไขข้อมูล
                    </button>
                  </div>
                )}
                {editing && (
                  <div className="space-y-3">
                    <Field label="ชื่อ">
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                      />
                    </Field>
                    <Field label="องค์กร">
                      <input
                        value={draft.organization}
                        onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                      />
                    </Field>
                    <Field label="จังหวัด">
                      <select
                        value={draft.province}
                        onChange={(e) => setDraft({ ...draft, province: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
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
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
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
                              className={`rounded-full border px-2.5 py-1 text-xs ${
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
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
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        <Save className="size-4" /> บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenId(null);
                          setDraft(null);
                        }}
                        className="rounded-xl border border-border px-4 py-2 text-sm"
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
                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-2 text-sm text-destructive"
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

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" /> แสดง {filtered.length} จาก {users.length} คน
        </p>
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
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SourceBadge({ source }: { source?: UserSource | undefined }) {
  const label = source ? SOURCE_LABEL[source] : "เข้าตรง";
  const color =
    source === "qr"
      ? "bg-lime/20 text-lime-foreground"
      : source === "link"
        ? "bg-coral/20 text-coral"
        : source === "invite"
          ? "bg-electric/20 text-electric"
          : source === "auth"
            ? "bg-primary/15 text-primary"
            : source === "admin"
              ? "bg-secondary text-secondary-foreground"
              : "bg-accent text-accent-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{label}</span>;
}

/** แผงรายละเอียดผู้ใช้: Power Profile · ความสนใจ · แมตช์ · การเชื่อมต่อ · commitment */
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
  const titleId = useId();

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
        closeRef.current();
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
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

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
      className="admin-person-overlay fixed inset-0 z-50 flex justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="admin-person-detail mt-10 w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card pb-24 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-5 py-3">
          <span className="text-2xl leading-none">{user.avatar}</span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-sm font-bold">
              {user.name}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {user.organization} · {provinceTh(user.province)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดรายละเอียดสมาชิก"
            className="tap rounded-lg p-1.5 text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={user.source} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
              {GENERATION_TH[user.generation] ?? user.generation}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
              {REGION_LABEL[user.region]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                st.missing.length ? "bg-coral/20 text-coral" : "bg-lime/20 text-lime-foreground"
              }`}
            >
              โปรไฟล์ {st.label} {st.percent}%
            </span>
          </div>

          <Section icon={<Sparkles className="size-3.5" />} title="Power Profile">
            <div className="grid gap-2">
              <PowerList label="พลังที่มี" items={user.powers_have} tone="bg-lime/15" />
              <PowerList label="พลังที่ต้องการ" items={user.powers_need} tone="bg-coral/15" />
            </div>
            {user.bio && <p className="mt-2 text-xs text-muted-foreground">{user.bio}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              onboard {fmtDate(user.created_at)}
              {user.updated_at ? ` · อัปเดต ${fmtDate(user.updated_at)}` : ""}
              {user.linked_at ? " · ผูกบัญชีอีเมลแล้ว" : ""}
            </p>
            {st.missing.length > 0 && (
              <p className="mt-1 text-xs text-coral">ข้อมูลที่ยังขาด: {st.missing.join(" / ")}</p>
            )}
          </Section>

          <Section icon={<Sparkles className="size-3.5" />} title="ความสนใจ">
            <div className="flex flex-wrap gap-1.5">
              {user.interests.length ? (
                user.interests.map((i) => (
                  <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {issueTh(i)}
                  </span>
                ))
              ) : (
                <Empty text="ยังไม่ได้เลือกความสนใจ" />
              )}
            </div>
          </Section>

          <Section
            icon={<Sparkles className="size-3.5" />}
            title={`คู่แมตช์แนะนำ (${matches.length})`}
          >
            {matches.length ? (
              <ul className="space-y-2">
                {matches.map((m) => (
                  <li key={m.user.id} className="rounded-xl border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{m.user.avatar}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                        {m.user.name}
                      </span>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                        {Math.round(m.score)}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="ยังไม่มีคู่แมตช์" />
            )}
          </Section>

          <Section
            icon={<Link2 className="size-3.5" />}
            title={`การเชื่อมต่อ (${myConnections.length})`}
          >
            {myConnections.length ? (
              <ul className="space-y-2">
                {myConnections.map((c) => {
                  const other = c.user_a === user.id ? c.user_b : c.user_a;
                  return (
                    <li key={c.id} className="rounded-xl border border-border p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                          กับ {nameOf(other)}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                          {STATUS_TH[c.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
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
            icon={<CalendarCheck className="size-3.5" />}
            title={`คำมั่นสัญญา (${myCommitments.length})`}
          >
            {myCommitments.length ? (
              <ul className="space-y-2">
                {myCommitments.map((m) => (
                  <li key={m.id} className="rounded-xl border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                        {m.action_type}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                        {STATUS_TH[m.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                    {m.follow_up_date && (
                      <p className="mt-0.5 text-xs text-primary">
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
            onClick={onEdit}
            className="tap w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
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
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold">
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
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.length ? (
          items.map((p) => (
            <span key={p} className={`rounded-full px-2.5 py-1 text-xs ${tone}`}>
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
  return <span className="text-xs text-muted-foreground">{text}</span>;
}
