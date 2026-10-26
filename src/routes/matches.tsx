import { createFileRoute, redirect } from "@tanstack/react-router";

// หน้าแรก "/" เป็นสำรับจับคู่แล้ว — ลิงก์เก่าไป /matches ยังใช้ได้
export const Route = createFileRoute("/matches")({
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/", search: location.search, replace: true });
  },
});
