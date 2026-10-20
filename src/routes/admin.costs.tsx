import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ADMIN_PASSWORD, useAdminAuth } from "@/lib/admin-auth";
import { summarizeCosts, type CostFile, type CostSummary } from "@/lib/cost-summary.functions";

export const Route = createFileRoute("/admin/costs")({
  head: () => ({
    meta: [
      { title: "สรุปค่าใช้จ่าย — คนส. Connexts" },
      { name: "description", content: "อัปโหลดข้อมูลเครดิตและใบแจ้งหนี้ แล้วสรุปค่าใช้จ่ายเป็นเงินบาท" },
      { property: "og:title", content: "สรุปค่าใช้จ่าย — คนส. Connexts" },
      { property: "og:description", content: "สรุปค่าใช้จ่ายเว็บเป็นเงินบาทพร้อมแจกแจงรายการ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCosts,
});

const TEXT_EXT = /\.(csv|json|txt|tsv|md)$/i;
const thb = (n: number) => n.toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 });

function readFile(file: File): Promise<CostFile> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    const isText = TEXT_EXT.test(file.name) || file.type.startsWith("text/") || file.type === "application/json";
    r.onerror = () => reject(new Error(`อ่านไฟล์ ${file.name} ไม่ได้`));
    r.onload = () =>
      resolve(
        isText
          ? { name: file.name, mime: file.type || "text/plain", text: String(r.result) }
          : { name: file.name, mime: file.type, dataUrl: String(r.result) },
      );
    if (isText) r.readAsText(file);
    else r.readAsDataURL(file);
  });
}

function AdminCosts() {
  const { role } = useAdminAuth();
  const run = useServerFn(summarizeCosts);
  const [files, setFiles] = useState<File[]>([]);
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CostSummary | null>(null);

  if (role && role !== "owner") {
    return <p className="text-muted-foreground">หน้านี้สำหรับเจ้าของโปรเจกต์เท่านั้น</p>;
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await Promise.all(files.map(readFile));
      const res = await run({
        data: { password: ADMIN_PASSWORD, files: payload, rate: rate ? Number(rate) : undefined, note: note || undefined },
      });
      if (res.ok) {
        setSummary(res.summary);
        toast.success("สรุปค่าใช้จ่ายเรียบร้อย");
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "สรุปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p lang="en" className="mission-eyebrow">Cost summary</p>
        <h1 className="text-3xl font-bold">สรุปค่าใช้จ่ายเป็นเงินบาท</h1>
        <p className="mt-2 text-muted-foreground">
          แนบไฟล์การใช้เครดิต (CSV, JSON, TXT) และใบแจ้งหนี้ (PDF หรือรูปภาพ) แล้วให้ AI แจกแจงรายการให้
        </p>
      </header>

      <section className="space-y-4 border border-border p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-border p-8 text-center hover:bg-accent">
          <FileUp className="h-6 w-6" aria-hidden />
          <span>เลือกไฟล์ (สูงสุด 6 ไฟล์ ไฟล์ละไม่เกิน 5 MB)</span>
          <input
            type="file"
            multiple
            accept=".csv,.json,.txt,.tsv,.md,.pdf,image/*"
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []).filter((f) => f.size <= 5_000_000);
              if (picked.length < (e.target.files?.length ?? 0)) toast.error("บางไฟล์ใหญ่เกิน 5 MB จึงไม่ได้แนบ");
              setFiles((prev) => [...prev, ...picked].slice(0, 6));
              e.target.value = "";
            }}
          />
        </label>
        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={f.name + i} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`เอา ${f.name} ออก`}
                  className="inline-flex h-9 w-9 items-center justify-center"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            อัตราแลกเปลี่ยน (บาทต่อ 1 ดอลลาร์ ไม่บังคับ)
            <input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="เช่น 33"
              className="mt-1 h-11 w-full border border-input bg-background px-3"
            />
          </label>
          <label className="text-sm">
            หมายเหตุ (ไม่บังคับ)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่รวมภาษี"
              className="mt-1 h-11 w-full border border-input bg-background px-3"
            />
          </label>
        </div>
        <Button variant="mission" className="h-12" disabled={busy || files.length === 0} onClick={submit}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {busy ? "กำลังสรุป…" : "สรุปค่าใช้จ่าย"}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </section>

      {summary && (
        <section className="space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-sm text-muted-foreground">{summary.period}</p>
              <p className="text-4xl font-bold">{thb(summary.total_thb)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">รายการ</th>
                  <th className="py-2 pr-4">หมวด</th>
                  <th className="py-2 pr-4 text-right">เครดิต</th>
                  <th className="py-2 pr-4 text-right">บาท</th>
                  <th className="py-2">ที่มา</th>
                </tr>
              </thead>
              <tbody>
                {summary.items.map((it, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-4">{it.label}</td>
                    <td className="py-2 pr-4">{it.category}</td>
                    <td className="py-2 pr-4 text-right">{it.credits ?? "–"}</td>
                    <td className="py-2 pr-4 text-right">{thb(it.amount_thb)}</td>
                    <td className="py-2 text-muted-foreground">{it.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.assumptions.length > 0 && (
            <div>
              <h2 className="font-semibold">สมมติฐาน</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {summary.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          {summary.notes && <p className="text-sm text-muted-foreground">{summary.notes}</p>}
          <p className="text-xs text-muted-foreground">ตัวเลขนี้ AI สรุปจากไฟล์ที่แนบมา ควรตรวจกับใบแจ้งหนี้จริงอีกครั้ง</p>
        </section>
      )}
    </div>
  );
}
