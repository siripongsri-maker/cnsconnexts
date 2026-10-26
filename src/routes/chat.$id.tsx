import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ChatRoom } from "@/components/chat-room";
import { useStore } from "@/lib/store";
import { MeadowState, STATE_PRIMARY } from "@/components/meadow-state";

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
    <MeadowState title="ยังไม่พบห้องแชทนี้" description="ลองเปิดจากรายการคู่ของคุณอีกครั้ง">
      <Link to="/commitments" className={STATE_PRIMARY}>
        กลับไปที่คู่ของฉัน
      </Link>
    </MeadowState>
  ),
});

function ChatPage() {
  const { id } = Route.useParams();
  const { connections, users, hydrated } = useStore();
  const conn = connections.find((c) => c.id === id);
  if (hydrated && !conn) throw notFound();
  const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
  const other = users.find((u) => u.id === otherId);

  const otherName = other?.name ?? "คู่ของคุณ";

  return (
    <div className="min-h-dvh pb-10">
      <header className="bg-sky-soft pb-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto w-full max-w-xl px-4 lg:max-w-3xl">
          <Link
            to="/connection/$id"
            params={{ id }}
            replace
            aria-label="กลับไปที่หน้าของคู่นี้"
            className="tap inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-4 text-body font-semibold text-ink shadow-[0_6px_16px_-10px_rgba(43,40,120,0.45)]"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
            ย้อนกลับ
          </Link>
          <h1 className="mt-4 font-heading text-title font-bold text-ink [overflow-wrap:anywhere]">
            คุยกับ {otherName}
          </h1>
          <p className="text-body text-ink-soft">แลกไอเดียกันสั้น ๆ แล้วนัดก้าวต่อไปด้วยกัน</p>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-xl px-4 pt-4 lg:max-w-3xl">
        <section aria-label="บทสนทนา">
          {hydrated ? (
            <>
              <ChatRoom connectionId={id} hideHeader />
              <Link
                to="/connection/$id"
                params={{ id }}
                hash="together-h"
                className="meadow-btn-secondary tap mt-4 w-full text-center"
              >
                ตกลงก้าวต่อไปด้วยกัน
              </Link>
            </>
          ) : (
            <p role="status" className="meadow-card p-6 text-center text-body text-ink-soft">
              กำลังเปิดห้องแชท…
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
