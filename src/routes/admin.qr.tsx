import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/qr")({
  head: () => ({
    meta: [
      { title: "QR และป้ายเข้าร่วม — คนส. Connexts" },
      { name: "description", content: "QR และป้ายเข้าร่วมสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "QR และป้ายเข้าร่วม — คนส. Connexts" },
      {
        property: "og:description",
        content: "QR และป้ายเข้าร่วมสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminQr,
});

function AdminQr() {
  const [origin, setOrigin] = useState("");
  const [code, setCode] = useState("CNS2026");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // ใช้พารามิเตอร์ c (ที่หน้า /join อ่าน) และติด source=qr เพื่อให้นับคนที่มาจากการสแกนได้
  const joinUrl = `${origin}/join?c=${encodeURIComponent(code)}&source=qr`;

  return (
    <div className="admin-workspace admin-workspace-qr space-y-4">
      <section className="card-soft space-y-3 rounded-2xl bg-card p-4">
        <label className="block space-y-1">
          <span className="text-body font-bold text-muted-foreground">รหัสห้อง</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body font-extrabold tracking-widest"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <div className="admin-qr-code">
            <QRCodeSVG
              value={joinUrl}
              size={160}
              fgColor="#000000"
              bgColor="#ffffff"
              role="img"
              aria-label={`QR สำหรับเข้าร่วมด้วยรหัส ${code}`}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="break-all rounded-xl bg-muted px-3 py-2 text-body">{joinUrl}</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(joinUrl);
                toast.success("คัดลอกลิงก์แล้ว");
              }}
              className="tap inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-body font-bold"
            >
              <Copy className="size-4" aria-hidden="true" /> คัดลอกลิงก์
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/print"
          className="tap inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body font-extrabold text-primary-foreground"
        >
          <Printer className="size-5" aria-hidden="true" /> ไปหน้าไฟล์พิมพ์บอร์ด/ป้าย
        </Link>
        <Link
          to="/qr"
          className="tap inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-body font-bold"
        >
          <QrCode className="size-5" aria-hidden="true" /> หน้า QR สำหรับผู้เข้าร่วม
        </Link>
      </div>
    </div>
  );
}
