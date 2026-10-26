/** กติกาการขอเชื่อมต่อ — ฟังก์ชันล้วน แยกจาก store เพื่อทดสอบได้ */
import type { AppNotification, Connection } from "./types";

/** คอนเนกชันระหว่างฉัน ("me") กับอีกคน ไม่ว่าใครเป็นฝ่ายขอ */
export function connectionWith(
  connections: readonly Connection[],
  otherId: string,
): Connection | undefined {
  return connections.find(
    (c) =>
      (c.user_a === "me" && c.user_b === otherId) || (c.user_b === "me" && c.user_a === otherId),
  );
}

/**
 * ถอนการเชื่อมต่อที่ใส่ไว้ล่วงหน้า (optimistic) เมื่อเขียนฐานข้อมูลไม่สำเร็จ
 * เอาคอนเนกชันนั้นและแจ้งเตือน "ส่งคำขอเชื่อมแล้ว" ของมันออก ส่วนอื่นคงเดิม
 */
export function rollbackConnect<
  S extends { connections: Connection[]; notifications: AppNotification[] },
>(state: S, connectionId: string): S {
  if (!state.connections.some((c) => c.id === connectionId)) return state;
  return {
    ...state,
    connections: state.connections.filter((c) => c.id !== connectionId),
    notifications: state.notifications.filter(
      (n) => !(n.kind === "connect_sent" && n.connection_id === connectionId),
    ),
  };
}
