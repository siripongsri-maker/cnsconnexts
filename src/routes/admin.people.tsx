import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Save, Trash2, Users, FileUp, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { PROVINCES } from "@/lib/thailand-geo";
import { ISSUES, type Region, type UserSource } from "@/lib/types";
import { issueTh, provinceTh, REGION_LABEL } from "@/lib/i18n";
import { downloadCSV, type Row } from "@/lib/export";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/admin/people")({
  head: () => ({
    meta: [
      { title: "จัดการข้อมูลสมาชิก — คนส. Connexts" },
      {
        name: "description",
        content: "หน้าผู้ดูแลสำหรับแก้ไขชื่อ องค์กร คำอธิบาย จังหวัด และแท็กความสนใจของสมาชิกแบบรวดเร็ว",
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

/** รหัสสมาชิกชุดเดโม่ (u1–u20) */
const DEMO_IDS = new Set(Array.from({ length: 20 }, (_, i) => `u${i + 1}`));
const isDemo = (id: string) => DEMO_IDS.has(id);

type SourceFilter = "all" | "real" | "demo" | UserSource;

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

function AdminPeoplePage() {
  const { users, updateUser, removeUser } = useStore();
  const [q, setQ] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return users.filter((u) => {
      if (source === "real" && isDemo(u.id)) return false;
      if (source === "demo" && !isDemo(u.id)) return false;
      if (source !== "all" && source !== "real" && source !== "demo" && u.source !== source) return false;
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
    <AppShell title="จัดการข้อมูลสมาชิก" subtitle={`แก้ไขข้อมูลเดโม่ได้ทันที · ${users.length} คน`}>
      <div className="space-y-4 px-5 pb-32 pt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ องค์กร จังหวัด หรือประเด็น"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex rounded-xl bg-muted p-0.5">
            {(["all", "real", "demo"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`tap flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  source === s ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {SOURCE_LABEL[s]}
                {s === "real" ? ` (${realCount})` : s === "demo" ? ` (${users.length - realCount})` : ""}
              </button>
            ))}
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">แหล่งที่มา</span>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as SourceFilter)}
                className="w-full appearance-none rounded-xl border border-border bg-background py-2 pl-8 pr-3 text-xs outline-none"
              >
                <option value="all">ทั้งหมด</option>
                <option value="real">ผู้ใช้จริง</option>
                <option value="demo">เดโม่</option>
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
              <span className="text-[11px] font-medium text-muted-foreground">onboard ตั้งแต่</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">ถึงวันที่</span>
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
              className="text-[11px] font-semibold text-primary"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
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

        <ul className="space-y-3">
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
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {issueTh(i)}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                ) : (
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
              : source === "demo"
                ? "bg-muted text-muted-foreground"
                : "bg-accent text-accent-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>{label}</span>
  );
}
