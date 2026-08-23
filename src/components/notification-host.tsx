import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

import { useStore } from "@/lib/store";
import { playConnext, unlockAudio } from "@/lib/notify";

/** Watches for new notifications and fires the "connext" ปิ๊ง cue + a toast. */
export function NotificationHost() {
  const { notifications, hydrated } = useStore();
  const router = useRouter();
  const seen = useRef<string | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const latest = notifications[0];
    if (!ready.current) {
      ready.current = true;
      seen.current = latest?.id ?? null;
      return;
    }
    if (!latest || latest.id === seen.current) return;
    seen.current = latest.id;

    playConnext();
    toast.success(latest.title, {
      description: latest.body,
      duration: 5000,
      ...(latest.connection_id
        ? {
            action: {
              label: "เปิดดู",
              onClick: () =>
                void router.navigate({
                  to: "/connection/$id",
                  params: { id: latest.connection_id as string },
                }),
            },
          }
        : {}),
    });
  }, [notifications, hydrated, router]);

  return null;
}
