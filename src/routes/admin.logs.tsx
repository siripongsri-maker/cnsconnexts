import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, Download, Lock, ShieldCheck, Trash2 } from "lucide-react";
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
  RETENTION_OPTIONS,
  logExpiresAt,
  logUsage,
  purgeExpiredLogs,
  useRetention,
  useUsageLogs,
  type UsageLog,
} from "@/lib/usage-log";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({
    meta: [
      { title: "สถิติการใช้งาน — คนส. Connexts" },
      { name: "description", content: "สถิติการใช้งานสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "สถิติการใช้งาน — คนส. Connexts" },
      {
        property: "og:description",
        content: "สถิติการใช้งานสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLogs,
});

/** Chart colours: BLOCK_TAG pairs (--tag-*-bg in admin-pages.css); purple = people, as everywhere in admin. Every series is also named in text (axis, legend or tooltip). */

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
  const { can, role, user: adminUser } = useAdminAuth();
  const canView = can("logs:view");
  const canSearch = can("logs:search");
  const canExport = can("logs:export");
  const canClear = can("logs:clear");
  const logs = useUsageLogs();
  const { days: retentionDays, setDays: setRetentionDays, cutoff } = useRetention();
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
  const PIE_COLORS = ["var(--tag-green-bg)", "var(--tag-orange-bg)"];

  /** วันหมดอายุของรายการเก่าสุด และจำนวนที่จะถูกลบใน 7 วัน */
  const oldest = logs.length ? logs[logs.length - 1] : null;
  const nextExpiry = oldest ? logExpiresAt(oldest, retentionDays) : null;
  const expiringSoon = useMemo(() => {
    if (!retentionDays) return 0;
    const limit = Date.now() + 7 * 86_400_000;
    return logs.filter((l) => {
      const exp = logExpiresAt(l, retentionDays);
      return exp ? exp.getTime() <= limit : false;
    }).length;
  }, [logs, retentionDays]);

  if (!canView) {
    return (
      <div className="card-soft rounded-2xl bg-card p-6 text-center">
        <Lock className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-2 text-title font-extrabold">ไม่มีสิทธิ์เข้าถึงบันทึกการใช้งาน</h2>
        <p className="mt-1 text-body text-muted-foreground">
          บทบาทของคุณ ({role ? ROLE_TH[role] : "-"}) ไม่ได้รับสิทธิ์ดู Log · ติดต่อผู้ดูแลสูงสุด
        </p>
      </div>
    );
  }

  return (
    <div className="admin-workspace admin-workspace-logs space-y-5">
      <section className="admin-log-access">
        <p className="text-body text-muted-foreground">
          บันทึกจะเก็บเฉพาะเมื่อผู้ใช้กดยินยอม PDPA บนหน้าแรก · เก็บในเครื่องผู้ใช้ สูงสุด 1,000
          รายการล่าสุด
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-body font-extrabold text-primary">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {adminUser ?? "-"} · {role ? ROLE_TH[role] : "-"} · สิทธิ์: ดู
          {canSearch ? " · ค้นหา" : ""}
          {canExport ? " · ส่งออก" : ""}
          {canClear ? " · ล้างบันทึก" : ""}
        </p>
      </section>

      <div className="admin-stat-grid grid grid-cols-3 gap-3">
        {[
          { l: "เหตุการณ์ทั้งหมด", v: logs.length },
          { l: "ผู้ใช้ (ไม่ระบุตัวตน)", v: visitors },
          { l: "การเข้าหน้า", v: pageViews },
        ].map((s) => (
          <div key={s.l} className="card-soft rounded-2xl bg-card p-4">
            <p className="text-2xl font-extrabold">{s.v}</p>
            <p className="text-body font-bold text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-title font-extrabold">การเข้าชมรายวัน (14 วันล่าสุด)</h2>
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--tag-purple-bg)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--tag-purple-bg)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 16 }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
                tickMargin={10}
                height={40}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 16 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{ fontSize: 16, borderRadius: 12 }}
                formatter={(v: number) => [`${v} ครั้ง`, "เข้าชม"]}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--tag-purple-bg)"
                strokeWidth={3}
                fill="url(#viewsFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <ul className="admin-chart-legend" aria-label="คำอธิบายกราฟ">
          <li>
            <span className="admin-chart-swatch admin-chart-swatch--line" aria-hidden="true" />
            จำนวนครั้งที่เข้าชมหน้าในแต่ละวัน
          </li>
        </ul>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="card-soft rounded-2xl bg-card p-4">
          <h2 className="text-title font-extrabold">แหล่งที่มา</h2>
          {sources.length === 0 ? (
            <p className="mt-2 text-body text-muted-foreground">ยังไม่มีข้อมูล</p>
          ) : (
            <>
              <div className="mt-3 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sources}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                  >
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 16 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={124}
                      tick={{ fontSize: 16 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 16, borderRadius: 12 }}
                      formatter={(v: number) => [`${v} เหตุการณ์`, "จำนวน"]}
                    />
                    <Bar
                      dataKey="value"
                      fill="var(--tag-purple-bg)"
                      radius={[0, 6, 6, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="admin-chart-legend" aria-label="คำอธิบายกราฟ">
                {sources.map((entry) => (
                  <li key={entry.name}>
                    {entry.name} · {entry.value} เหตุการณ์
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card-soft rounded-2xl bg-card p-4">
          <h2 className="text-title font-extrabold">อัตราการยินยอม PDPA</h2>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <pattern
                      id="declinedHatch"
                      width="8"
                      height="8"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width="8" height="8" fill="var(--tag-orange-bg)" />
                      <rect width="3" height="8" fill="var(--card)" />
                    </pattern>
                  </defs>
                  <Pie
                    data={consentTotal ? consentPie : [{ name: "ยังไม่มีข้อมูล", value: 1 }]}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={60}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {(consentTotal ? consentPie : [{ name: "-", value: 1 }]).map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={
                          consentTotal
                            ? i === 1
                              ? "url(#declinedHatch)"
                              : PIE_COLORS[i]
                            : "var(--muted)"
                        }
                      />
                    ))}
                  </Pie>
                  {consentTotal > 0 && (
                    <Tooltip contentStyle={{ fontSize: 16, borderRadius: 12 }} />
                  )}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 text-body">
              <p className="text-3xl font-extrabold text-foreground">{consentRate}%</p>
              <ul className="admin-chart-legend" aria-label="คำอธิบายกราฟ">
                <li>
                  <span
                    className="admin-chart-swatch"
                    style={{ background: PIE_COLORS[0] }}
                    aria-hidden="true"
                  />
                  ยินยอม {consentStats.accepted}
                </li>
                <li>
                  <span
                    className="admin-chart-swatch admin-chart-swatch--hatch"
                    aria-hidden="true"
                  />
                  ไม่ยินยอม {consentStats.declined}
                </li>
              </ul>
              <p className="mt-1 text-body text-muted-foreground">นับจากการตัดสินใจบนเครื่องนี้</p>
            </div>
          </div>
        </section>
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-title font-extrabold">นโยบายการเก็บรักษาและลบข้อมูลอัตโนมัติ</h2>
        </div>
        <p className="mt-1 text-body text-muted-foreground">
          ระบบจะลบบันทึกที่เก่ากว่าระยะเวลาที่กำหนดโดยอัตโนมัติ
          (ตรวจสอบทุกนาทีและทุกครั้งที่เปิดหน้านี้)
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-body font-bold">เก็บบันทึกไว้</label>
          <select
            value={retentionDays}
            disabled={!canClear}
            onChange={(e) => {
              const next = Number(e.target.value);
              setRetentionDays(next);
              logUsage(
                "admin",
                "ตั้งค่านโยบายการเก็บรักษา Log",
                `${adminUser ?? "-"} · ${next === 0 ? "ไม่ลบอัตโนมัติ" : `${next} วัน`}`,
              );
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-body disabled:opacity-50"
          >
            {RETENTION_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>
                {o.label}
              </option>
            ))}
          </select>
          {canClear ? (
            <button
              type="button"
              onClick={() => {
                const removed = purgeExpiredLogs();
                logUsage(
                  "admin",
                  "ลบบันทึกหมดอายุด้วยตนเอง",
                  `${adminUser ?? "-"} · ${removed} รายการ`,
                );
                alert(removed ? `ลบบันทึกหมดอายุแล้ว ${removed} รายการ` : "ไม่มีบันทึกที่หมดอายุ");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-body font-extrabold"
            >
              <Trash2 className="size-4" aria-hidden="true" /> ลบรายการหมดอายุตอนนี้
            </button>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2 text-body font-bold text-muted-foreground">
              <Lock className="size-4" aria-hidden="true" /> เฉพาะผู้ดูแลสูงสุด
            </span>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-body font-bold text-muted-foreground">เก็บย้อนหลังถึง</p>
            <p className="text-body font-extrabold">
              {cutoff ? fmt(cutoff.toISOString()) : "ไม่จำกัด"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-body font-bold text-muted-foreground">รายการเก่าสุดจะหมดอายุ</p>
            <p className="text-body font-extrabold">
              {nextExpiry ? fmt(nextExpiry.toISOString()) : "ไม่มีกำหนด"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-body font-bold text-muted-foreground">จะถูกลบใน 7 วันข้างหน้า</p>
            <p className="text-body font-extrabold">{expiringSoon} รายการ</p>
          </div>
        </div>
      </section>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-title font-extrabold">สถานะความยินยอมของเครื่องนี้</h2>
        <p className="mt-1 text-body text-muted-foreground">
          {consent
            ? `${consent.value === "accepted" ? "ยินยอม" : "ไม่ยินยอม"} · เวอร์ชัน ${consent.version} · ${fmt(consent.decided_at)}`
            : "ยังไม่ได้ตัดสินใจ"}
        </p>
      </section>

      {topPages.length > 0 && (
        <section className="card-soft rounded-2xl bg-card p-4">
          <h2 className="text-title font-extrabold">หน้าที่ถูกเข้าบ่อย</h2>
          <ul className="mt-2 space-y-1">
            {topPages.map(([p, n]) => (
              <li key={p} className="flex justify-between text-body">
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
          className="min-w-[180px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-body disabled:opacity-50"
        />
        <select
          value={type}
          disabled={!canSearch}
          onChange={(e) => setType(e.target.value as UsageLog["type"] | "all")}
          className="rounded-xl border border-border bg-background px-3 py-2 text-body disabled:opacity-50"
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
                    หมดอายุ: (() => {
                      const exp = logExpiresAt(l, retentionDays);
                      return exp ? fmt(exp.toISOString()) : "ไม่หมดอายุ";
                    })(),
                  })),
                );
                logUsage(
                  "admin",
                  "ส่งออกบันทึกการใช้งาน (CSV)",
                  `${adminUser ?? "-"} · ${filtered.length} รายการ`,
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-body font-extrabold"
            >
              <Download className="size-4" aria-hidden="true" /> CSV
            </button>
            <button
              type="button"
              onClick={() => {
                downloadJSON("usage-logs", filtered);
                logUsage(
                  "admin",
                  "ส่งออกบันทึกการใช้งาน (JSON)",
                  `${adminUser ?? "-"} · ${filtered.length} รายการ`,
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-body font-extrabold"
            >
              <Download className="size-4" aria-hidden="true" /> JSON
            </button>
          </>
        ) : (
          <span className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2 text-body font-bold text-muted-foreground">
            <Lock className="size-4" aria-hidden="true" /> ส่งออกต้องมีสิทธิ์
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-card px-4 py-2 text-body font-extrabold text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" /> ล้างบันทึก
          </button>
        ) : (
          <span className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2 text-body font-bold text-muted-foreground">
            <Lock className="size-4" aria-hidden="true" /> ล้างบันทึกต้องมีสิทธิ์
          </span>
        )}
      </div>

      <section
        className="admin-data-table card-soft overflow-x-auto rounded-2xl bg-card"
        aria-label="ตารางบันทึกการใช้งาน"
        tabIndex={0}
        data-lenis-prevent
      >
        <table className="w-full text-left text-body">
          <caption className="sr-only">บันทึกการใช้งานล่าสุด</caption>
          <thead className="bg-muted/40 text-body font-extrabold">
            <tr>
              <th scope="col" className="px-3 py-2">
                เวลา
              </th>
              <th scope="col" className="px-3 py-2">
                ประเภท
              </th>
              <th scope="col" className="px-3 py-2">
                เหตุการณ์
              </th>
              <th scope="col" className="px-3 py-2">
                หน้า
              </th>
              <th scope="col" className="px-3 py-2">
                ผู้ใช้
              </th>
              <th scope="col" className="px-3 py-2">
                หมดอายุ
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
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
                  <td className="admin-log-visitor px-3 py-2 text-muted-foreground">{l.visitor}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {(() => {
                      const exp = logExpiresAt(l, retentionDays);
                      return exp ? fmt(exp.toISOString()) : "ไม่หมดอายุ";
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
