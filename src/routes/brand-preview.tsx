import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, Palette } from "lucide-react";

import { Wordmark } from "@/components/wordmark";
import cnsMarkAsset from "@/assets/cns-mark.png.asset.json";
const cnsLogo = cnsMarkAsset.url;

export const Route = createFileRoute("/brand-preview")({
  head: () => ({
    meta: [
      { title: "ตัวอย่างแบรนด์ — คนส. Connexts" },
      {
        name: "description",
        content: "ดูตัวอย่างชื่อแบรนด์และโลโก้ คนส. Connexts บนพื้นหลังสีต่างๆ",
      },
      { property: "og:title", content: "ตัวอย่างแบรนด์ — คนส. Connexts" },
      {
        property: "og:description",
        content: "ดูตัวอย่างชื่อแบรนด์และโลโก้ คนส. Connexts บนพื้นหลังสีต่างๆ",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandPreview,
});

const SWATCHES = [
  { name: "พื้นหลังอ่อน", className: "bg-background", note: "โหมดสว่าง" },
  { name: "การ์ด", className: "bg-card border border-border", note: "พื้นหลังการ์ด" },
  { name: "พื้นหลังมืด", className: "dark bg-background", note: "โหมดมืด" },
  { name: "ม่วงไฟฟ้า", className: "dark bg-primary", note: "สีหลัก" },
  { name: "ฟ้าไฟฟ้า", className: "dark bg-electric", note: "สีฟ้า" },
  { name: "ปะการัง", className: "dark bg-coral", note: "สีปะการัง" },
  { name: "มะนาว", className: "dark bg-lime", note: "สีเขียวมะนาว" },
  { name: "ไล่สี", className: "gradient-power", note: "Gradient หลัก" },
];

const SIZES: Array<"xs" | "sm" | "md" | "hero"> = ["xs", "sm", "md", "hero"];

function BrandPreview() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 px-5 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <Link
            to="/"
            className="tap inline-grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-foreground"
            aria-label="กลับหน้าแรก"
          >
            <Home className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold leading-tight tracking-tight sm:text-xl">
              ตัวอย่างแบรนด์
            </h1>
            <p className="text-[12.5px] text-muted-foreground">
              ดูชื่อแบรนด์และโลโก้บนพื้นหลังต่างๆ
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 pt-5">
        <section className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-primary">
            <Palette className="h-5 w-5" strokeWidth={2.2} />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">
              Brandmark Preview
            </h2>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            หน้านี้แสดงว่า wordmark “คนส. Connexts” และโลโก้สัญลักษณ์จะปรากฏอย่างไรบนพื้นหลังสีต่างๆ
            ทั้งโหมดสว่าง มืด และสีแบรนด์
          </p>
        </section>

        <section className="space-y-4">
          {SWATCHES.map((swatch) => (
            <article
              key={swatch.name}
              className={`relative overflow-hidden rounded-3xl p-5 shadow-card ${swatch.className}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wide opacity-80">
                  {swatch.name}
                </h3>
                <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold opacity-70 dark:bg-white/15">
                  {swatch.note}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  {SIZES.map((size) => (
                    <div
                      key={size}
                      className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-sm"
                    >
                      <span className="w-10 shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-60">
                        {size}
                      </span>
                      <Wordmark size={size} />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                    พร้อมโลโก้
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <Wordmark size="sm" withMark />
                    <Wordmark size="md" withMark />
                    <Wordmark size="hero" withMark />
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                    โลโก้ล้วน
                  </span>
                  <div className="flex items-center gap-4">
                    <img
                      src={cnsLogo}
                      alt="โลโก้ คนส. Connexts"
                      className="h-8 w-8 object-contain"
                    />
                    <img
                      src={cnsLogo}
                      alt=""
                      aria-hidden
                      className="h-12 w-12 object-contain"
                    />
                    <img
                      src={cnsLogo}
                      alt=""
                      aria-hidden
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="tap inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground"
          >
            <Home className="h-4 w-4" />
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    </div>
  );
}
