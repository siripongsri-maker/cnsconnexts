import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

import { useStore, useUserMap } from "@/lib/store";
import { playConnext } from "@/lib/notify";
import { emitLive } from "@/lib/live";
import { issueTh, powerTh } from "@/lib/i18n";
import {
  loadPresets,
  PRESETS_EVENT,
  userMatchesFilters,
  type FilterPreset,
} from "@/lib/filter-presets";

const LABEL = { issueTh, powerTh };

/** แจ้งเตือนเมื่อมีคนใหม่หรือคู่เชื่อมต่อใหม่ที่ตรงกับชุดตัวกรองที่บันทึกไว้ */
export function FilterAlerts() {
  const { users, connections, hydrated } = useStore();
  const userMap = useUserMap();
  const router = useRouter();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const seenUsers = useRef<Set<string> | null>(null);
  const seenConns = useRef<Set<string> | null>(null);

  useEffect(() => {
    const sync = () => setPresets(loadPresets().filter((p) => p.alerts));
    sync();
    window.addEventListener(PRESETS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PRESETS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // ครั้งแรก: จำสถานะปัจจุบันไว้ ไม่ต้องแจ้งย้อนหลัง
    if (!seenUsers.current) {
      seenUsers.current = new Set(users.map((u) => u.id));
      seenConns.current = new Set(connections.map((c) => c.id));
      return;
    }
    if (!presets.length) {
      seenUsers.current = new Set(users.map((u) => u.id));
      seenConns.current = new Set(connections.map((c) => c.id));
      return;
    }

    let fired = false;

    for (const u of users) {
      if (seenUsers.current.has(u.id)) continue;
      seenUsers.current.add(u.id);
      const hit = presets.find((p) => userMatchesFilters(u, p.filters, LABEL));
      if (!hit) continue;
      fired = true;
      toast.success(`แมตช์ใหม่ตรงตัวกรอง “${hit.name}”`, {
        description: `${u.name} · ${u.organization ?? u.province ?? ""}`.trim(),
        duration: 6000,
        action: {
          label: "ดูแมตช์",
          onClick: () => void router.navigate({ to: "/matches" }),
        },
      });
      emitLive("match", "แมตช์ใหม่ตรงตัวกรอง", `${u.name} · ชุด “${hit.name}”`, true);
    }

    for (const c of connections) {
      if (seenConns.current!.has(c.id)) continue;
      seenConns.current!.add(c.id);
      const a = userMap[c.user_a];
      const b = userMap[c.user_b];
      const hit = presets.find(
        (p) =>
          userMatchesFilters(a, p.filters, LABEL) || userMatchesFilters(b, p.filters, LABEL),
      );
      if (!hit) continue;
      fired = true;
      toast.success(`คู่เชื่อมต่อใหม่ตรงตัวกรอง “${hit.name}”`, {
        description: `${a?.name ?? "?"} × ${b?.name ?? "?"}`,
        duration: 6000,
        action: {
          label: "เปิดดู",
          onClick: () => void router.navigate({ to: "/connection/$id", params: { id: c.id } }),
        },
      });
      emitLive(
        "connect",
        "คู่เชื่อมต่อใหม่ตรงตัวกรอง",
        `${a?.name ?? "?"} × ${b?.name ?? "?"} · ชุด “${hit.name}”`,
        true,
      );
    }

    if (fired) playConnext({ speak: false });
  }, [users, connections, userMap, presets, hydrated, router]);

  return null;
}
