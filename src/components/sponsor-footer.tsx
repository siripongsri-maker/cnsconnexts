import schLogo from "@/assets/sch-logo.png.asset.json";

/** แถบโลโก้ผู้สนับสนุนหลัก (สช. — สำนักงานคณะกรรมการสุขภาพแห่งชาติ) */
export function SponsorFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`flex flex-col items-center gap-2 py-6 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        สนับสนุนหลักโดย
      </p>
      <img
        src={schLogo.url}
        alt="สำนักงานคณะกรรมการสุขภาพแห่งชาติ (สช.)"
        width={112}
        height={112}
        loading="lazy"
        className="h-16 w-auto object-contain"
      />
    </footer>
  );
}
