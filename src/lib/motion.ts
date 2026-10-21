import { useEffect, useState } from "react";

export function pageTransitionTypes({ pathChanged }: { pathChanged: boolean }): string[] | false {
  if (!pathChanged || typeof window === "undefined") return false;
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.hasAttribute("data-lowspec")
  )
    return false;
  return ["page"];
}

export function useMotionSettings() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowSpec, setLowSpec] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      const reduced = mql.matches;
      setReducedMotion(reduced);

      const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean };
      };
      const memory = nav.deviceMemory;
      const saveData = nav.connection?.saveData;

      // ไม่ใช้ hardwareConcurrency: iOS Safari รายงานค่าต่ำเสมอ (กันการ fingerprint)
      // ทำให้ iPhone ทุกเครื่องถูกมองว่าเป็นเครื่องสเปกต่ำ
      const isLowSpec = reduced || !!saveData || (typeof memory === "number" && memory <= 2);

      setLowSpec(isLowSpec);
      setReady(true);
    };

    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return { reducedMotion, lowSpec, ready };
}
