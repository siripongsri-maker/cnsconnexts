import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";

import { downloadCSV, downloadJSON } from "@/lib/export";
import {
  LOG_TYPE_LABEL,
  clearLogs,
  getConsent,
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
          placeholder="ค้นหา หน้า/เหตุการณ์/รหัสผู้ใช้"
          className="min-w-[180px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[12px]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as UsageLog["type"] | "all")}
          className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "ทุกประเภท" : LOG_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
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
            )
          }
          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[12px] font-extrabold"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button
          type="button"
          onClick={() => downloadJSON("usage-logs", filtered)}
          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[12px] font-extrabold"
        >
          <Download className="h-3.5 w-3.5" /> JSON
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("ลบบันทึกการใช้งานทั้งหมดในเครื่องนี้?")) clearLogs();
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-2 text-[12px] font-extrabold text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> ล้างบันทึก
        </button>
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
