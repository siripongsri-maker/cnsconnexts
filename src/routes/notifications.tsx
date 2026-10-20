import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2, Trash2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { useStore, useUserMap } from "@/lib/store";
import { Avatar } from "@/components/power-bits";
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

  return (
    <AppShell title="การแจ้งเตือน" subtitle="สัญญาณการเชื่อมต่อของคุณ">
      <div className="space-y-4 px-5 py-4">
        <div className="card-soft flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
            {sound ? <Volume2 className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">เสียง “connext” ปิ๊ง</p>
            <p className="text-[12px] text-muted-foreground">เล่นเสียงเมื่อมีการเชื่อมต่อใหม่</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !sound;
              setSound(next);
              setSoundOn(next);
              if (next) {
                unlockAudio();
                playConnext({ force: true });
              }
            }}
            className={`tap h-9 rounded-full px-4 text-[13px] font-bold ${
              sound ? "gradient-power text-primary-foreground" : "bg-accent text-foreground"
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
          className="tap w-full rounded-xl border border-border bg-card py-3 text-sm font-bold"
        >
          ลองฟังเสียงแจ้งเตือน 🔔
        </button>

        {notifications.length === 0 ? (
          <div className="card-soft grid place-items-center gap-2 p-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-bold">ยังไม่มีการแจ้งเตือน</p>
            <p className="text-[13px] text-muted-foreground">
              ลองไปกด “เชื่อมต่อ” ที่หน้าคู่เชื่อม แล้วรอสัญญาณตอบกลับ
            </p>
            <Link
              to="/matches"
              className="tap mt-2 inline-flex h-10 items-center rounded-xl gradient-power px-5 text-sm font-bold text-primary-foreground"
            >
              ไปหาคู่เชื่อม
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {notifications.map((n, i) => {
                const u = users[n.from_id];
                const body = (
                  <div
                    className={`card-soft animate-rise flex items-start gap-3 p-4 ${
                      n.read ? "" : "ring-1 ring-primary/40"
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {u ? (
                      <Avatar user={u} size={42} />
                    ) : (
                      <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-accent">
                        🔔
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold">{n.title}</p>
                      <p className="text-[13px] text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-coral" />}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.connection_id ? (
                      <Link to="/connection/$id" params={{ id: n.connection_id }} className="block">
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
              className="tap inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" /> ล้างการแจ้งเตือนทั้งหมด
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
