import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ChatRoom } from "@/components/chat-room";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({
    meta: [
      { title: "ห้องแชทคู่เชื่อมต่อ — คนส. Connext" },
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
  notFoundComponent: () => <p className="p-8 text-center text-sm">ไม่พบห้องแชทนี้</p>,
});

function ChatPage() {
  const { id } = Route.useParams();
  const { connections, hydrated } = useStore();
  const conn = connections.find((c) => c.id === id);
  if (hydrated && !conn) throw notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/connection/$id"
            params={{ id }}
            className="tap grid h-9 w-9 place-items-center rounded-full bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[17px] font-extrabold leading-tight">ห้องแชทสั้น</h1>
            <p className="text-[12px] text-muted-foreground">คุยแล้วนัดหมายก้าวต่อไป</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-5 pb-10 pt-2">
        {hydrated && <ChatRoom connectionId={id} />}
      </main>
    </div>
  );
}
