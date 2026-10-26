import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2, Trash2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { useStore, useUserMap } from "@/lib/store";
import { Avatar } from "@/components/power-bits";
import { MeadowScene } from "@/components/meadow-scene";
import { isSoundOn, playConnext, setSoundOn, unlockAudio } from "@/lib/notify";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "การแจ้งเตือน · คนส. Connexts" },
      {
        name: "description",
        content: "ดูสัญญาณการเชื่อมต่อใหม่ คำตอบรับ และก้าวต่อไปจากเพื่อนในเครือข่าย คนส. Connexts",
      },
      { property: "og:title", content: "การแจ้งเตือน · คนส. Connexts" },
      {
        property: "og:description",
        content: "สัญญาณการเชื่อมต่อใหม่และก้าวต่อไปในเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.round(h / 24)} วันที่แล้ว`;
}

function NotificationsPage() {
  const { notifications, markNotificationsRead, clearNotifications } = useStore();
  const users = useUserMap();
  const [sound, setSound] = useState(true);

  useEffect(() => {
    setSound(isSoundOn());
    const t = setTimeout(() => markNotificationsRead(), 800);
    return () => clearTimeout(t);
  }, [markNotificationsRead]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundOn(next);
    if (next) {
      unlockAudio();
      playConnext({ force: true });
    }
  };

  return (
    <AppShell title="การแจ้งเตือน" subtitle="ข่าวใหม่จากคนที่คุณเชื่อมกัน">
      <div className="flex flex-col gap-6">
        <section aria-label="รายการแจ้งเตือน">
          {notifications.length === 0 ? (
            <div className="meadow-card overflow-hidden text-center">
              <MeadowScene variant="empty" className="pointer-events-none" />
              <div className="flex flex-col items-center gap-3 p-6">
                <h2 className="font-heading text-title font-semibold text-ink">รอข่าวใหม่</h2>
                <p className="text-body text-ink-soft">
                  เริ่มเชื่อมกับคนที่คุณอยากคุย แล้วติดตามคำตอบและนัดหมายได้ที่นี่
                </p>
                <Link to="/" className="meadow-btn-primary tap mt-1 w-full max-w-sm text-center">
                  ไปจับคู่
                </Link>
              </div>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {notifications.map((n, i) => {
                  const u = users[n.from_id];
                  const body = (
                    <div
                      className={`meadow-card animate-rise flex items-start gap-3 p-4 ${
                        n.read ? "" : "border-2 border-primary"
                      }`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {u ? (
                        <Avatar user={u} size={48} />
                      ) : (
                        <span
                          aria-hidden
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-ink"
                        >
                          <Bell className="h-6 w-6" strokeWidth={2.2} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-semibold text-ink [overflow-wrap:anywhere]">
                          {!n.read && (
                            <span className="mr-2 inline-flex items-center rounded-full bg-primary px-3 text-body font-semibold text-white">
                              ใหม่
                            </span>
                          )}
                          {n.title}
                        </p>
                        <p className="text-body text-ink [overflow-wrap:anywhere]">{n.body}</p>
                        <p className="mt-1 text-body text-ink-soft">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.connection_id ? (
                        <Link
                          to="/connection/$id"
                          params={{ id: n.connection_id }}
                          className="block rounded-3xl"
                        >
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={clearNotifications}
                className="meadow-btn-secondary tap mt-4 w-full"
              >
                <Trash2 className="h-6 w-6" aria-hidden /> ล้างการแจ้งเตือนทั้งหมด
              </button>
            </>
          )}
        </section>

        <section aria-labelledby="sound-h" className="meadow-card p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-ink"
            >
              {sound ? (
                <Volume2 className="h-6 w-6" strokeWidth={2.2} />
              ) : (
                <BellOff className="h-6 w-6" strokeWidth={2.2} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="sound-h" className="font-heading text-lead font-semibold text-ink">
                เสียงแจ้งเตือน
              </h2>
              <p className="text-body text-ink-soft">เล่นเสียงเมื่อมีคนเชื่อมกับคุณ</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sound}
              aria-labelledby="sound-h"
              onClick={toggleSound}
              className={`tap inline-flex min-h-12 min-w-20 shrink-0 items-center justify-center rounded-full border-2 px-4 text-body font-semibold ${
                sound
                  ? "border-primary bg-primary text-white"
                  : "border-[#C9C6E0] bg-white text-ink"
              }`}
            >
              {sound ? "เปิด" : "ปิด"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              playConnext({ force: true });
            }}
            className="meadow-btn-secondary tap mt-4 w-full"
          >
            ลองฟังเสียงแจ้งเตือน
          </button>
        </section>
      </div>
    </AppShell>
  );
}
