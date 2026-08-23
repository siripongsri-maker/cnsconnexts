import { useEffect, useState } from "react";

export function useMotionSettings() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowSpec, setLowSpec] = useState(false);

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
      const cores = navigator.hardwareConcurrency;
      const saveData = nav.connection?.saveData;

      const isLowSpec =
        reduced ||
        !!saveData ||
        (typeof memory === "number" && memory <= 4) ||
        (typeof cores === "number" && cores <= 4);

      setLowSpec(isLowSpec);
    };

    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return { reducedMotion, lowSpec };
}
