import { Fragment } from "react";

import { PROFILE_SYNC_FAILED } from "@/lib/use-retry-profile-sync";

/**
 * "ยังบันทึกโปรไฟล์ไม่สำเร็จ ลองส่งอีกครั้ง" — ตัดบรรทัดตรงช่องว่างระหว่างสองวลีเท่านั้น
 * (ภาษาไทยตัดคำกลางวลีได้ เช่น "ไม่|สำเร็จ" ซึ่งอ่านสะดุด) แต่ละวลียังขึ้นบรรทัดใหม่ได้เองถ้าจอแคบมาก
 */
export function ProfileSyncFailed() {
  return (
    <>
      {PROFILE_SYNC_FAILED.split(" ").map((part, i) => (
        <Fragment key={part}>
          {i > 0 && " "}
          <span className="inline-block">{part}</span>
        </Fragment>
      ))}
    </>
  );
}
