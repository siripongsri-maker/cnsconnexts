import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { MAP_VIEWBOX, PROVINCES } from "@/lib/thailand-geo";
import { REGIONS, type Region } from "@/lib/types";
import { issueTh, provinceTh, REGION_LABEL } from "@/lib/i18n";
import { makeJoinCode } from "@/lib/session";

export const Route = createFileRoute("/print")({
  head: () => ({
    meta: [
      { title: "ชุดไฟล์พิมพ์ — คนส. Connect" },
      {
        name: "description",
        content:
          "บอร์ดแผนที่ภาคขนาด A0 พร้อมหมุดรายคน การ์ดนโยบายรายคนขนาด A4 และป้าย QR สำหรับตั้งในห้อง ทุกไฟล์มี QR อัปเดตข้อมูลตัวเอง",
      },
      { property: "og:title", content: "ชุดไฟล์พิมพ์สำหรับหน้างาน" },
      { property: "og:description", content: "บอร์ด A0 · การ์ด A4 · ป้าย QR" },
    ],
  }),
  component: PrintKit,
});

type Sheet = "board" | "cards" | "sign";

const PAGE_CSS: Record<Sheet, string> = {
  board: "@page { size: 841mm 1189mm; margin: 12mm; }",
  cards: "@page { size: A4 portrait; margin: 10mm; }",
  sign: "@page { size: A4 portrait; margin: 12mm; }",
};

const REGION_FILL: Record<Region, string> = {
  North: "var(--color-primary)",
  Northeast: "var(--color-coral)",
  Central: "var(--color-electric)",
  Bangkok: "var(--color-electric)",
  South: "var(--color-lime)",
  Nationwide: "var(--color-muted-foreground)",
};

function useJoinUrl() {
  const code = makeJoinCode();
  const [url, setUrl] = useState(`/join?c=${code}`);
  useEffect(() => setUrl(`${window.location.origin}/join?c=${code}`), [code]);
  return { url, code };
}

function PrintKit() {
  const { users, submissions } = useStore();
  const [sheet, setSheet] = useState<Sheet>("board");
  const [region, setRegion] = useState<Region>("North");
  const { url, code } = useJoinUrl();

  const subByName = useMemo(
    () => new Map(submissions.map((s) => [s.name, s])),
    [submissions],
  );

  const people = useMemo(() => {
    const fromUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      province: u.province,
      region: u.region,
      org: u.organization,
      work: subByName.get(u.name)?.summary ?? u.bio,
      issues: subByName.get(u.name)?.policy_issues ?? u.interests,
      wanted: subByName.get(u.name)?.wanted ?? "",
      course: subByName.get(u.name)?.course ?? "",
      photo: u.photo,
    }));
    const extra = submissions
      .filter((s) => !users.some((u) => u.name === s.name))
      .map((s) => ({
        id: s.id,
        name: s.name,
        province: s.province,
        region: s.region,
        org: `${s.course} ${s.batch}`.trim(),
        work: s.summary,
        issues: s.policy_issues,
        wanted: s.wanted,
        course: s.course as string,
        photo: s.photo,
      }));
    return [...fromUsers, ...extra];
  }, [users, submissions, subByName]);

  const regionPeople = people.filter((p) => p.region === region);

  const pins = useMemo(() => {
    const byProvince = new Map<string, typeof regionPeople>();
    regionPeople.forEach((p) =>
      byProvince.set(p.province, [...(byProvince.get(p.province) ?? []), p]),
    );
    return [...byProvince.entries()].map(([prov, list]) => {
      const shape = PROVINCES.find((x) => x.en === prov);
      return { prov, list, cx: shape?.cx ?? 500, cy: shape?.cy ?? 800 };
    });
  }, [regionPeople]);

  return (
    <div className="min-h-screen bg-muted/40">
      <style>{PAGE_CSS[sheet]}</style>
      <div className="no-print sticky top-0 z-20 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          <h1 className="mr-2 text-base font-extrabold">ชุดไฟล์พิมพ์</h1>
          <div className="flex rounded-2xl border border-border bg-card p-1">
            {(
              [
                ["board", "บอร์ดแผนที่ A0"],
                ["cards", "การ์ดนโยบาย A4"],
                ["sign", "ป้าย QR"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSheet(k)}
                className={`tap rounded-xl px-3.5 py-2 text-[13px] font-bold ${
                  sheet === k ? "gradient-power text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {sheet !== "sign" && (
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as Region)}
              className="h-10 rounded-2xl border border-border bg-card px-3 text-[13px] font-bold"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {REGION_LABEL[r]}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => window.print()}
            className="tap ml-auto flex items-center gap-2 rounded-2xl gradient-power px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground"
          >
            <Printer className="h-4 w-4" />
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {sheet === "board" && (
          <div className="board-scroll overflow-x-auto">
          <section className="print-sheet board-sheet bg-card p-8 text-foreground">
            <header className="flex items-start justify-between gap-6 border-b-4 border-primary pb-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary">
                  คนส. CONNECT
                </p>
                <h2 className="text-4xl font-extrabold">
                  แผนที่พลัง{REGION_LABEL[region]}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {regionPeople.length} คน · {pins.length} จังหวัด · สมัชชาสุขภาพแห่งชาติ
                </p>
              </div>
              <QrBlock url={url} code={code} size={130} />
            </header>

            <div className="mt-6 grid grid-cols-[1.15fr_1fr] gap-8">
              <svg viewBox={MAP_VIEWBOX} className="w-full">
                {PROVINCES.map((p) => {
                  const on = p.region === region;
                  return (
                    <path
                      key={p.en}
                      d={p.d}
                      fill={on ? REGION_FILL[p.region] : "var(--color-muted)"}
                      fillOpacity={on ? 0.22 : 0.35}
                      stroke="var(--color-background)"
                      strokeWidth={1.4}
                    />
                  );
                })}
                {pins.map((pin) => (
                  <g key={pin.prov}>
                    <circle
                      cx={pin.cx}
                      cy={pin.cy}
                      r={10 + pin.list.length * 3}
                      fill={REGION_FILL[region]}
                      fillOpacity={0.95}
                    />
                    <text
                      x={pin.cx}
                      y={pin.cy + 6}
                      textAnchor="middle"
                      fontSize={16}
                      fontWeight={800}
                      fill="var(--color-background)"
                    >
                      {pin.list.length}
                    </text>
                    <text
                      x={pin.cx + 18 + pin.list.length * 2}
                      y={pin.cy + 6}
                      fontSize={20}
                      fontWeight={700}
                      fill="var(--color-foreground)"
                    >
                      {provinceTh(pin.prov)}
                    </text>
                  </g>
                ))}
              </svg>

              <div className="columns-2 gap-4 text-[11px] leading-snug">
                {pins.map((pin) => (
                  <div key={pin.prov} className="mb-3 break-inside-avoid">
                    <p className="mb-1 border-b border-border pb-0.5 text-[13px] font-extrabold">
                      {provinceTh(pin.prov)}
                    </p>
                    {pin.list.map((p) => (
                      <p key={p.id} className="mb-1">
                        <span className="font-bold">{p.name}</span>
                        {p.org ? <span className="text-muted-foreground"> · {p.org}</span> : null}
                        <br />
                        <span className="text-muted-foreground">{p.work}</span>
                      </p>
                    ))}
                  </div>
                ))}
                {pins.length === 0 && (
                  <p className="text-muted-foreground">ยังไม่มีข้อมูลในภาคนี้</p>
                )}
              </div>
            </div>
            <p className="mt-6 text-center text-sm font-bold text-muted-foreground">
              สแกน QR เพื่อเพิ่มหรืออัปเดตข้อมูลของคุณเอง · {url}
            </p>
          </section>
          </div>
        )}

        {sheet === "cards" && (
          <div className="space-y-6">
            {regionPeople.map((p) => (
              <section
                key={p.id}
                className="print-sheet break-after-page bg-card p-10 text-foreground"
              >
                <div className="flex items-start justify-between gap-6 border-b-4 border-primary pb-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
                      การ์ดนโยบายรายคน
                    </p>
                    <h2 className="text-3xl font-extrabold">{p.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {[p.course, p.org].filter(Boolean).join(" · ")} · {provinceTh(p.province)} ·{" "}
                      {REGION_LABEL[p.region]}
                    </p>
                  </div>
                  <QrBlock url={url} code={code} size={110} />
                </div>
                {p.photo && (
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="mt-5 h-44 w-full rounded-2xl border border-border object-cover"
                  />
                )}
                <div className="mt-5 space-y-4 text-[15px] leading-relaxed">
                  <Block label="ประเด็นนโยบายที่ทำ">
                    <div className="flex flex-wrap gap-2">
                      {p.issues.map((i) => (
                        <span
                          key={i}
                          className="rounded-full bg-primary/10 px-3 py-1 text-[13px] font-bold text-primary"
                        >
                          {issueTh(i)}
                        </span>
                      ))}
                    </div>
                  </Block>
                  <Block label="สรุปงาน">{p.work}</Block>
                  {p.wanted && <Block label="อยากชวนเพื่อนมาร่วม">{p.wanted}</Block>}
                </div>
                <p className="mt-8 text-center text-[13px] font-bold text-muted-foreground">
                  สแกน QR มุมขวาบนเพื่ออัปเดตข้อมูลของคุณเอง
                </p>
              </section>
            ))}
            {regionPeople.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                ยังไม่มีคนในภาคนี้
              </p>
            )}
          </div>
        )}

        {sheet === "sign" && (
          <section className="print-sheet flex min-h-[70vh] flex-col items-center justify-center bg-card p-12 text-center text-foreground">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-primary">
              คนส. CONNECT
            </p>
            <h2 className="mt-3 text-5xl font-extrabold leading-tight">
              สแกนเพื่ออัปเดต
              <br />
              ข้อมูลของคุณ
            </h2>
            <p className="mt-3 max-w-md text-base text-muted-foreground">
              ยกกล้องมือถือส่อง QR แล้วเพิ่มโปรไฟล์ ผลงาน และหมุดจังหวัดของคุณขึ้นแผนที่ได้ทันที
            </p>
            <div className="mt-8 rounded-3xl border-4 border-primary p-6">
              <QRCodeSVG value={url} size={280} level="M" bgColor="transparent" fgColor="#3b0f78" />
            </div>
            <p className="mt-6 text-lg font-extrabold">รหัสห้อง {code}</p>
            <p className="mt-1 text-sm text-muted-foreground">{url}</p>
          </section>
        )}
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function QrBlock({ url, code, size }: { url: string; code: string; size: number }) {
  return (
    <div className="shrink-0 text-center">
      <QRCodeSVG value={url} size={size} level="M" bgColor="transparent" fgColor="#3b0f78" />
      <p className="mt-1 text-[11px] font-bold text-muted-foreground">อัปเดตข้อมูล · {code}</p>
    </div>
  );
}
