import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Lock, ShieldCheck, Trash2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ROLE_TH, useAdminAuth } from "@/lib/admin-auth";
import { downloadCSV, downloadJSON } from "@/lib/export";
import {
  LOG_TYPE_LABEL,
  clearLogs,
  getConsent,
  getConsentStats,
  logUsage,
  useUsageLogs,
  type UsageLog,
} from "@/lib/usage-log";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

const TYPES: Array<UsageLog["type"] | "all"> = [
  "all",
  "page_view",
  "action",
  "auth",
  "admin",
  "consent",
];

function fmt(at: string) {
  try {
    return new Date(at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return at;
  }
}

function AdminLogs() {
  const logs = useUsageLogs();
  const [type, setType] = useState<UsageLog["type"] | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (type !== "all" && l.type !== type) return false;
      if (!needle) return true;
      return [l.label, l.detail, l.path, l.visitor]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [logs, type, q]);

  const visitors = useMemo(() => new Set(logs.map((l) => l.visitor)).size, [logs]);
  const pageViews = logs.filter((l) => l.type === "page_view").length;
  const consent = typeof window === "undefined" ? null : getConsent();

  const topPages = useMemo(() => {
    const counts = new Map<string, number>();
    logs
      .filter((l) => l.type === "page_view" && l.path)
      .forEach((l) => counts.set(l.path!, (counts.get(l.path!) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [logs]);

  /** การเข้าชมรายวัน 14 วันล่าสุด */
  const daily = useMemo(() => {
    const counts = new Map<string, number>();
    logs
      .filter((l) => l.type === "page_view")
      .forEach((l) => {
        const key = l.at.slice(0, 10);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    const out: Array<{ day: string; label: string; views: number }> = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({
        day: key,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        views: counts.get(key) ?? 0,
      });
    }
    return out;
  }, [logs]);

  /** แหล่งที่มาของผู้เข้าชม */
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => {
      const s = l.source ?? "direct";
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name === "direct" ? "เข้าตรง" : name, value }));
  }, [logs]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- รีเฟรชตามบันทึกล่าสุด
  const consentStats = useMemo(() => getConsentStats(), [logs.length]);
  const consentTotal = consentStats.accepted + consentStats.declined;
  const consentRate = consentTotal ? Math.round((consentStats.accepted / consentTotal) * 100) : 0;
  const consentPie = [
    { name: "ยินยอม", value: consentStats.accepted },
    { name: "ไม่ยินยอม", value: consentStats.declined },
  ];
  const PIE_COLORS = ["var(--primary)", "var(--muted-foreground)"];

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-[18px] font-extrabold">Log การเข้าใช้งาน</h1>
        <p className="text-[12px] text-muted-foreground">
          บันทึกจะเก็บเฉพาะเมื่อผู้ใช้กดยินยอม PDPA บนหน้าแรก · เก็บในเครื่องผู้ใช้ สูงสุด 1,000 รายการล่าสุด
        </p>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "เหตุการณ์ทั้งหมด", v: logs.length },
          { l: "ผู้ใช้ (ไม่ระบุตัวตน)", v: visitors },
          { l: "การเข้าหน้า", v: pageViews },
        ].map((s) => (
          <div key={s.l} className="card-soft rounded-2xl bg-card p-4">
            <p className="text-2xl font-extrabold text-gradient">{s.v}</p>
            <p className="text-[11px] font-bold text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">การเข้าชมรายวัน (14 วันล่าสุด)</h2>
        <div className="mt-3 h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12 }}
                formatter={(v: number) => [`${v} ครั้ง`, "เข้าชม"]}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#viewsFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="card-soft rounded-2xl bg-card p-4">
          <h2 className="text-[14px] font-extrabold">แหล่งที่มา</h2>
          {sources.length === 0 ? (
            <p className="mt-2 text-[12px] text-muted-foreground">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="mt-3 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sources} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => [`${v} เหตุการณ์`, "จำนวน"]} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[0, 6, 6, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card-soft rounded-2xl bg-card p-4">
          <h2 className="text-[14px] font-extrabold">อัตราการยินยอม PDPA</h2>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={consentTotal ? consentPie : [{ name: "ยังไม่มีข้อมูล", value: 1 }]}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={60}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {(consentTotal ? consentPie : [{ name: "-", value: 1 }]).map((entry, i) => (
                      <Cell key={entry.name} fill={consentTotal ? PIE_COLORS[i] : "var(--muted)"} />
                    ))}
                  </Pie>
                  {consentTotal > 0 && <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[12px]">
              <p className="text-3xl font-extrabold text-gradient">{consentRate}%</p>
              <p className="text-muted-foreground">ยินยอม {consentStats.accepted} · ไม่ยินยอม {consentStats.declined}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">นับจากการตัดสินใจบนเครื่องนี้</p>
            </div>
          </div>
        </section>
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">สถานะความยินยอมของเครื่องนี้</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {consent
            ? `${consent.value === "accepted" ? "ยินยอม" : "ไม่ยินยอม"} · เวอร์ชัน ${consent.version} · ${fmt(consent.decided_at)}`
            : "ยังไม่ได้ตัดสินใจ"}
        </p>
      </section>

      {topPages.length > 0 && (
        <section className="card-soft rounded-2xl bg-card p-4">
          <h2 className="text-[14px] font-extrabold">หน้าที่ถูกเข้าบ่อย</h2>
          <ul className="mt-2 space-y-1">
            {topPages.map(([p, n]) => (
              <li key={p} className="flex justify-between text-[12px]">
                <span className="truncate">{p}</span>
                <span className="font-extrabold">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={!canSearch}
          placeholder={canSearch ? "ค้นหา หน้า/เหตุการณ์/รหัสผู้ใช้" : "บทบาทนี้ไม่มีสิทธิ์ค้นหา"}
          className="min-w-[180px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[12px] disabled:opacity-50"
        />
        <select
          value={type}
          disabled={!canSearch}
          onChange={(e) => setType(e.target.value as UsageLog["type"] | "all")}
          className="rounded-xl border border-border bg-background px-3 py-2 text-[12px] disabled:opacity-50"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "ทุกประเภท" : LOG_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        {canExport ? (
          <>
            <button
              type="button"
              onClick={() => {
                downloadCSV(
                  "usage-logs",
                  filtered.map((l) => ({
                    เวลา: fmt(l.at),
                    ประเภท: LOG_TYPE_LABEL[l.type],
                    เหตุการณ์: l.label,
                    รายละเอียด: l.detail ?? "",
                    หน้า: l.path ?? "",
                    ผู้ใช้: l.visitor,
                  })),
                );
                logUsage("admin", "ส่งออกบันทึกการใช้งาน (CSV)", `${adminUser ?? "-"} · ${filtered.length} รายการ`);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[12px] font-extrabold"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={() => {
                downloadJSON("usage-logs", filtered);
                logUsage("admin", "ส่งออกบันทึกการใช้งาน (JSON)", `${adminUser ?? "-"} · ${filtered.length} รายการ`);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[12px] font-extrabold"
            >
              <Download className="h-3.5 w-3.5" /> JSON
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-[12px] font-bold text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> ส่งออกต้องมีสิทธิ์
          </span>
        )}
        {canClear ? (
          <button
            type="button"
            onClick={() => {
              if (confirm("ลบบันทึกการใช้งานทั้งหมดในเครื่องนี้?")) {
                clearLogs();
                logUsage("admin", "ล้างบันทึกการใช้งานทั้งหมด", adminUser ?? "-");
              }
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-2 text-[12px] font-extrabold text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> ล้างบันทึก
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-[12px] font-bold text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> ล้างบันทึกต้องมีสิทธิ์
          </span>
        )}
      </div>


      <section className="card-soft overflow-x-auto rounded-2xl bg-card">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-muted/40 text-[11px] font-extrabold">
            <tr>
              <th className="px-3 py-2">เวลา</th>
              <th className="px-3 py-2">ประเภท</th>
              <th className="px-3 py-2">เหตุการณ์</th>
              <th className="px-3 py-2">หน้า</th>
              <th className="px-3 py-2">ผู้ใช้</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  ยังไม่มีบันทึกการใช้งาน
                </td>
              </tr>
            ) : (
              filtered.slice(0, 300).map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="whitespace-nowrap px-3 py-2">{fmt(l.at)}</td>
                  <td className="px-3 py-2">{LOG_TYPE_LABEL[l.type]}</td>
                  <td className="px-3 py-2">
                    {l.label}
                    {l.detail ? <span className="text-muted-foreground"> · {l.detail}</span> : null}
                  </td>
                  <td className="px-3 py-2">{l.path}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.visitor}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
