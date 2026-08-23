import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FileUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { PROVINCE_BY_TH, PROVINCES } from "@/lib/thailand-geo";
import type { Generation, Region, User } from "@/lib/types";
import { provinceTh, REGION_LABEL } from "@/lib/i18n";

export const Route = createFileRoute("/admin/import")({
  head: () => ({
    meta: [
      { title: "นำเข้ารายชื่อ CSV — Connecting Power" },
      {
        name: "description",
        content: "อัปโหลดไฟล์ CSV รายชื่อสมาชิกจาก สช. แล้วขึ้นหมุดบนแผนที่พลังทันที",
      },
      { property: "og:title", content: "นำเข้ารายชื่อจาก สช." },
      { property: "og:description", content: "อัปโหลด CSV แล้วขึ้นหมุดบนแผนที่ทันที" },
    ],
  }),
  component: ImportPage,
});

const TEMPLATE = "ชื่อ,จังหวัด,องค์กร,หลักสูตร,ประเด็น,สรุปงาน\nสมชาย ใจดี,เชียงราย,สภาเยาวชน,คนส.,เยาวชน,ทำงานเยาวชนในพื้นที่";

function splitLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if ((ch === "," || ch === "\t") && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function findProvince(value: string) {
  const v = value.replace(/^จังหวัด/, "").trim();
  if (PROVINCE_BY_TH[v]) return PROVINCE_BY_TH[v];
  return PROVINCES.find((p) => p.en.toLowerCase() === v.toLowerCase());
}

type Parsed = { user: User; ok: boolean; raw: string };

function ImportPage() {
  const { importUsers, users } = useStore();
  const [rows, setRows] = useState<Parsed[]>([]);
  const [fileName, setFileName] = useState("");
  const [imported, setImported] = useState(0);

  const parse = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return setRows([]);
    const header = splitLine(lines[0] ?? "");
    const isHeader = header.some((h) => /ชื่อ|name/i.test(h));
    const body = isHeader ? lines.slice(1) : lines;
    const idx = (...keys: string[]) =>
      isHeader ? header.findIndex((h) => keys.some((k) => h.includes(k))) : -1;

    const iName = idx("ชื่อ", "name");
    const iProv = idx("จังหวัด", "province");
    const iOrg = idx("องค์กร", "หน่วยงาน", "org");
    const iCourse = idx("หลักสูตร", "รุ่น", "course");
    const iIssue = idx("ประเด็น", "issue");
    const iSummary = idx("สรุป", "งาน", "bio");

    const parsed = body.map((line, n) => {
      const c = splitLine(line);
      const pick = (i: number, fallback: number) => (i >= 0 ? (c[i] ?? "") : (c[fallback] ?? ""));
      const name = pick(iName, 0);
      const provRaw = pick(iProv, 1);
      const shape = findProvince(provRaw);
      const user: User = {
        id: `imp-${Date.now()}-${n}`,
        name: name || "ไม่ระบุชื่อ",
        avatar: "✨",
        province: shape?.en ?? "Bangkok",
        region: (shape?.region ?? "Nationwide") as Region,
        organization: pick(iOrg, 2) || "สช.",
        generation: "Millennial" as Generation,
        bio: pick(iSummary, 5) || pick(iCourse, 3),
        interests: pick(iIssue, 4)
          ? pick(iIssue, 4)
              .split(/[;|/]/)
              .map((x) => x.trim())
              .filter(Boolean)
          : [],
        powers_have: [],
        powers_need: [],
        created_at: new Date().toISOString(),
      };
      return { user, ok: Boolean(name && shape), raw: line };
    });
    setRows(parsed);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setImported(0);
    const reader = new FileReader();
    reader.onload = () => parse(String(reader.result));
    reader.readAsText(file, "utf-8");
  };

  const valid = rows.filter((r) => r.ok);

  return (
    <AppShell title="นำเข้ารายชื่อ (CSV)" subtitle={`ฐานข้อมูลปัจจุบัน ${users.length} คน`}>
      <div className="space-y-5 px-5 pb-32 pt-4">
        <label className="tap flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-card text-sm font-bold text-muted-foreground">
          <FileUp className="h-6 w-6 text-primary" />
          {fileName || "เลือกไฟล์ CSV รายชื่อจาก สช."}
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>

        <details className="rounded-2xl border border-border bg-card p-4 text-[13px]">
          <summary className="cursor-pointer font-extrabold">รูปแบบไฟล์ที่รองรับ</summary>
          <p className="mt-2 text-muted-foreground">
            คอลัมน์: ชื่อ, จังหวัด, องค์กร, หลักสูตร, ประเด็น, สรุปงาน (จังหวัดเป็นภาษาไทยได้เลย)
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-muted p-3 text-[11px]">{TEMPLATE}</pre>
        </details>

        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-[13px] font-bold">
              <span className="rounded-full bg-lime/25 px-3 py-1 text-lime-foreground">
                พร้อมนำเข้า {valid.length}
              </span>
              {rows.length - valid.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-coral/12 px-3 py-1 text-coral">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  ตรวจไม่ผ่าน {rows.length - valid.length}
                </span>
              )}
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-3 text-[13px] ${
                    r.ok ? "border-border bg-card" : "border-coral/40 bg-coral/5"
                  }`}
                >
                  <p className="font-extrabold">{r.user.name}</p>
                  <p className="text-muted-foreground">
                    {provinceTh(r.user.province)} · {REGION_LABEL[r.user.region]} ·{" "}
                    {r.user.organization}
                  </p>
                  {!r.ok && <p className="mt-1 text-coral">ไม่พบชื่อหรือจังหวัดที่ตรงกัน</p>}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                importUsers(valid.map((r) => r.user));
                setImported(valid.length);
                setRows([]);
              }}
              disabled={valid.length === 0}
              className="tap flex h-14 w-full items-center justify-center rounded-3xl gradient-power text-sm font-extrabold text-primary-foreground disabled:opacity-40"
            >
              นำเข้า {valid.length} รายชื่อ แล้วขึ้นหมุดบนแผนที่
            </button>
          </>
        )}

        {imported > 0 && (
          <div className="rounded-3xl border border-lime/40 bg-lime/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-lime" />
            <p className="mt-2 text-sm font-extrabold">นำเข้าแล้ว {imported} รายชื่อ</p>
            <Link
              to="/map"
              className="tap mt-3 inline-flex h-12 items-center justify-center rounded-2xl gradient-power px-6 text-sm font-extrabold text-primary-foreground"
            >
              ดูหมุดบนแผนที่
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
