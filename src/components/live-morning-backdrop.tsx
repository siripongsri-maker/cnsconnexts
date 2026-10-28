import type { JSX } from "react";

import { useMotionSettings } from "@/lib/motion";

/**
 * The four blobs of the morning-light mockup (dawn branch of `paintBg()`), at
 * fixed positions, sizes and animation delays so the server render and the
 * first client render match.
 */
const BLOBS = [
  { color: "#b07ad6", left: "-5%", top: "-10%", size: "45%", delay: "-4s" },
  { color: "#7cc4f2", left: "50%", top: "40%", size: "50%", delay: "-12s" },
  { color: "#ffd36b", left: "70%", top: "-15%", size: "35%", delay: "-18s" },
  { color: "#9bd47a", left: "10%", top: "60%", size: "35%", delay: "-8s" },
] as const;

/**
 * Soft colour blobs drifting behind the big live screen. Render it as the first
 * child of the `.live-morning` container; styles live in
 * `src/styles/live-morning.css`. With low-spec (or reduced motion) the blobs
 * stand still and the frosted surfaces drop their backdrop blur.
 */
export function LiveMorningBackdrop(): JSX.Element {
  const { lowSpec } = useMotionSettings();
  return (
    <div aria-hidden="true" className="live-morning-backdrop" data-still={lowSpec ? "" : undefined}>
      {BLOBS.map((blob) => (
        <span
          key={blob.color}
          className="live-morning-blob"
          style={{
            background: blob.color,
            left: blob.left,
            top: blob.top,
            width: blob.size,
            height: blob.size,
            animationDelay: blob.delay,
          }}
        />
      ))}
    </div>
  );
}
