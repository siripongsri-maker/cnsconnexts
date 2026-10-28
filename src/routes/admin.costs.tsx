import { useEffect, useId, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MissionEmpty } from "@/components/mission-ui";
import { getAdminToken, useAdminAuth } from "@/lib/admin-auth";
import { summarizeCosts, type CostFile, type CostSummary } from "@/lib/cost-summary.functions";

export const Route = createFileRoute("/admin/costs")({
  head: () => ({
    meta: [
      { title: "สรุปค่าใช้จ่าย — คนส. Connexts" },
      {
        name: "description",
        content: "อัปโหลดข้อมูลเครดิตและใบแจ้งหนี้ แล้วสรุปค่าใช้จ่ายเป็นเงินบาท",
      },
      { property: "og:title", content: "สรุปค่าใช้จ่าย — คนส. Connexts" },
      { property: "og:description", content: "สรุปค่าใช้จ่ายเว็บเป็นเงินบาทพร้อมแจกแจงรายการ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCosts,
});

const TEXT_EXT = /\.(csv|json|txt|tsv|md)$/i;
const thb = (n: number) =>
  n.toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 });

function readFile(file: File): Promise<CostFile> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    const isText =
      TEXT_EXT.test(file.name) || file.type.startsWith("text/") || file.type === "application/json";
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
  const [resultRevision, setResultRevision] = useState(0);
  const resultRef = useRef<HTMLElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultTitleId = useId();

  useEffect(() => {
    if (resultRevision === 0) return;
    const panel = resultRef.current;
    const heading = resultHeadingRef.current;
    if (!panel || !heading) return;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.hasAttribute("data-lowspec");
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    if (reduced || typeof panel.animate !== "function") return;
    const animation = panel.animate(
      [
        { opacity: 0, transform: "translate3d(0, 18px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      { duration: 420, easing: "cubic-bezier(.16, 1, .3, 1)" },
    );
    return () => animation.cancel();
  }, [resultRevision]);

  if (role && role !== "owner") {
    return (
      <MissionEmpty
        className="admin-empty"
        title="สำหรับเจ้าของโปรเจกต์"
        description="บัญชีนี้ไม่มีสิทธิ์สรุปค่าใช้จ่าย"
      />
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await Promise.all(files.map(readFile));
      const res = await run({
        data: {
          token: getAdminToken() ?? "",
          files: payload,
          rate: rate ? Number(rate) : undefined,
          note: note || undefined,
        },
      });
      if (res.ok) {
        setSummary(res.summary);
        setResultRevision((revision) => revision + 1);
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
    <div className="admin-workspace admin-workspace-costs space-y-6">
      <div className="admin-section-meta">
        <span>เอกสารค่าใช้จ่าย</span>
        <span>{files.length} / 6 ไฟล์</span>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {busy
          ? "กำลังอ่านเอกสารและสรุปค่าใช้จ่าย"
          : error
            ? ""
            : summary
              ? "ผลสรุปค่าใช้จ่ายพร้อมแล้ว"
              : ""}
      </p>
      <section className="admin-cost-input card-soft space-y-5" aria-busy={busy}>
        <label className="admin-upload-zone flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-border p-8 text-center hover:bg-accent">
          <FileUp className="h-6 w-6" aria-hidden />
          <span className="admin-upload-title">แนบไฟล์ค่าใช้จ่าย</span>
          <span className="admin-upload-hint">
            CSV · JSON · TXT · PDF · รูปภาพ
            <br />
            สูงสุด 6 ไฟล์ ไฟล์ละไม่เกิน 5 MB
          </span>
          <input
            type="file"
            multiple
            accept=".csv,.json,.txt,.tsv,.md,.pdf,image/*"
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []).filter((f) => f.size <= 5_000_000);
              if (picked.length < (e.target.files?.length ?? 0))
                toast.error("บางไฟล์ใหญ่เกิน 5 MB จึงไม่ได้แนบ");
              setFiles((prev) => [...prev, ...picked].slice(0, 6));
              e.target.value = "";
            }}
          />
        </label>
        {files.length > 0 && (
          <ul className="admin-cost-files space-y-2">
            {files.map((f, i) => (
              <li
                key={f.name + i}
                className="flex items-center justify-between gap-3 border-b border-border pb-2 text-body"
              >
                <span className="min-w-0 flex-1 break-words">{f.name}</span>
                <button
                  type="button"
                  aria-label={`เอา ${f.name} ออก`}
                  className="inline-flex size-11 shrink-0 items-center justify-center border border-border text-muted-foreground"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-body">
            อัตราแลกเปลี่ยน{" "}
            <span className="text-body text-muted-foreground">(บาท / 1 ดอลลาร์ · ไม่บังคับ)</span>
            <input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="เช่น 33"
              className="mt-1 h-11 w-full border border-input bg-background px-3"
            />
          </label>
          <label className="block text-body">
            หมายเหตุ <span className="text-body text-muted-foreground">(ไม่บังคับ)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่รวมภาษี"
              className="mt-1 h-11 w-full border border-input bg-background px-3"
            />
          </label>
        </div>
        <Button
          variant="mission"
          className="admin-cost-submit min-h-12 w-full justify-center gap-3"
          disabled={busy || files.length === 0}
          onClick={submit}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {busy ? "กำลังสรุป…" : "สรุปค่าใช้จ่าย"}
        </Button>
        {error && (
          <p role="alert" className="text-body text-destructive">
            {error}
          </p>
        )}
      </section>

      {summary && (
        <section
          ref={resultRef}
          className="admin-cost-summary card-soft space-y-5"
          aria-labelledby={resultTitleId}
          data-motion-local="true"
        >
          <div className="admin-cost-summary-head flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <h2
                ref={resultHeadingRef}
                id={resultTitleId}
                tabIndex={-1}
                className="admin-cost-result-title admin-section-label"
              >
                สรุปจากไฟล์
              </h2>
              <p className="text-body text-muted-foreground">{summary.period}</p>
              <p className="admin-cost-total">{thb(summary.total_thb)}</p>
            </div>
          </div>
          <div
            className="admin-data-table overflow-x-auto"
            role="region"
            aria-label="ตารางรายการค่าใช้จ่าย"
            tabIndex={0}
            data-lenis-prevent
          >
            <table className="w-full text-body">
              <caption className="sr-only">รายการค่าใช้จ่ายจากไฟล์แนบ</caption>
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4">
                    รายการ
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    หมวด
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right">
                    เครดิต
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right">
                    บาท
                  </th>
                  <th scope="col" className="py-2">
                    ที่มา
                  </th>
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
            <div className="admin-cost-assumptions">
              <h3 className="font-medium">สมมติฐาน</h3>
              <ul className="mt-2 list-disc pl-5 text-body text-muted-foreground">
                {summary.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.notes && <p className="text-body text-muted-foreground">{summary.notes}</p>}
          <p className="admin-cost-review text-body text-muted-foreground">
            AI สรุปจากไฟล์แนบ ควรตรวจกับใบแจ้งหนี้จริงอีกครั้ง
          </p>
        </section>
      )}
    </div>
  );
}
