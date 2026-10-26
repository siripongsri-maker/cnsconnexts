import schLogo from "@/assets/sch-logo.png.asset.json";

/** แถบโลโก้ผู้สนับสนุนหลัก (สช. — สำนักงานคณะกรรมการสุขภาพแห่งชาติ) */
export function SponsorFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`flex flex-col items-center gap-4 py-8 ${className}`}>
      <p className="text-xs font-medium text-muted-foreground print:text-slate-700">
        สนับสนุนหลักโดย
      </p>
      <div className="flex items-center gap-3.5">
        {/* Frame the original blue badge; preserve the white emblem inside it. */}
        <span
          className="relative block w-14 shrink-0 overflow-hidden rounded-[9%]"
          style={{ aspectRatio: "248 / 231" }}
          aria-hidden="true"
        >
          <img
            src={schLogo.url}
            alt=""
            width={447}
            height={447}
            loading="lazy"
            className="absolute top-[-21.645%] left-[-39.113%] h-auto w-[180.242%] max-w-none"
          />
        </span>
        <p className="text-left text-body font-medium text-foreground print:text-[#240c87]">
          <span className="block">สำนักงานคณะกรรมการ</span>
          <span className="block">สุขภาพแห่งชาติ (สช.)</span>
        </p>
      </div>
    </footer>
  );
}
