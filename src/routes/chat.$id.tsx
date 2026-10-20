import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ChatRoom } from "@/components/chat-room";
import { useStore } from "@/lib/store";
import { MissionHeader, MissionState, MissionVisual } from "@/components/mission-ui";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({
    meta: [
      { title: "ห้องแชทคู่เชื่อมต่อ — คนส. Connexts" },
      {
        name: "description",
        content: "คุยสั้น ๆ แบบเรียลไทม์กับคู่เชื่อมต่อของคุณ แล้วนัดหมายการลงมือทำร่วมกัน",
      },
      { property: "og:title", content: "ห้องแชทคู่เชื่อมต่อ" },
      { property: "og:description", content: "คุยสั้น ๆ แล้วนัดหมายก้าวต่อไปด้วยกัน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
  notFoundComponent: () => (
    <MissionState
      code="Signal unavailable"
      title="ยังไม่พบห้องแชทนี้"
      description="ลองเปิดจากรายการคู่เชื่อมของคุณอีกครั้ง"
    >
      <Link
        to="/matches"
        className="tap mt-4 inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
      >
        กลับไปหาคู่เชื่อม
      </Link>
    </MissionState>
  ),
});

function ChatPage() {
  const { id } = Route.useParams();
  const { connections, users, hydrated } = useStore();
  const conn = connections.find((c) => c.id === id);
  if (hydrated && !conn) throw notFound();
  const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
  const other = users.find((u) => u.id === otherId);

  return (
    <div className="editorial-focused mission-chat-page min-h-screen">
      <header className="mission-focused-topbar sticky top-0 z-20 bg-background/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/connection/$id"
            params={{ id }}
            replace
            aria-label="กลับไปที่การ์ดคอนเนกชัน"
            className="tap grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-medium leading-tight">
              คุยกับ {other?.name ?? "คู่เชื่อมของคุณ"}
            </p>
            <p className="text-[12px] text-muted-foreground">คนส. Connexts</p>
          </div>
        </div>
      </header>
      <main id="main-content" className="chat-page-layout mx-auto px-5 pb-10 pt-2">
        <aside className="chat-mission-aside">
          <p className="mission-kicker" lang="en">
            A shared next step
          </p>
          <h1>
            เริ่มจากบทสนทนา
            <br />
            ไปสู่การลงมือทำ
          </h1>
          <MissionVisual variant="signal" />
          <p className="mission-side-note">
            แลกไอเดียกับ {other?.name ?? "คู่เชื่อมของคุณ"} แล้วนัดก้าวต่อไปด้วยกัน
          </p>
        </aside>
        <section className="chat-page-console" aria-label="บทสนทนา">
          {hydrated ? (
            <>
              <ChatRoom connectionId={id} hideHeader />
              <Link
                to="/connection/$id"
                params={{ id }}
                hash="together-h"
                className="tap mt-4 flex min-h-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-sm font-extrabold text-primary"
              >
                ตกลงก้าวต่อไปด้วยกัน
              </Link>
            </>
          ) : (
            <p role="status" className="py-10 text-center text-sm text-muted-foreground">
              กำลังเปิดห้องแชท…
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
