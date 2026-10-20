import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ChatRoom } from "@/components/chat-room";
import { useStore } from "@/lib/store";

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
    <div className="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <p className="text-sm">ไม่เจอห้องแชทนี้นะ อาจถูกลบไปแล้ว หรือเน็ตยังไม่มา</p>
        <Link
          to="/matches"
          className="tap mt-4 inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          กลับไปดูคนที่น่าเชื่อมต่อ{" "}
          <span lang="en" className="ml-1 opacity-80">
            · Back to matches
          </span>
        </Link>
      </div>
    </div>
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-background/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
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
            <h1 className="truncate text-[17px] font-extrabold leading-tight">
              คุยกับ {other?.name ?? "คู่เชื่อมของคุณ"}
            </h1>
            <p className="text-[12px] text-muted-foreground">คุยกันแล้วตกลงก้าวต่อไปด้วยกัน</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-5 pb-10 pt-2">
        {hydrated ? (
          <>
            <ChatRoom connectionId={id} hideHeader />
            <Link
              to="/connection/$id"
              params={{ id }}
              hash="together-h"
              className="tap mt-4 flex min-h-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-sm font-extrabold text-primary"
            >
              ตกลงก้าวต่อไปด้วยกัน{" "}
              <span lang="en" className="ml-1 font-semibold">
                · Next step
              </span>
            </Link>
          </>
        ) : (
          <p role="status" className="py-10 text-center text-sm text-muted-foreground">
            กำลังเปิดห้องแชท…
          </p>
        )}
      </main>
    </div>
  );
}
