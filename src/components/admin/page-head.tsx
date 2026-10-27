import { createContext, useContext, useEffect } from "react";

type SetTitleNote = (note: string | null) => void;

/** Set by the admin shell; pages use `useAdminTitleNote` instead of reading it. */
export const AdminTitleNoteContext = createContext<SetTitleNote>(() => {});

/**
 * Adds a short note after the shared admin page title, e.g. a record count: "รายชื่อสมาชิก (24)".
 * Display only; the note is cleared when the page unmounts.
 */
export function useAdminTitleNote(note: string | null) {
  const setNote = useContext(AdminTitleNoteContext);
  useEffect(() => {
    setNote(note);
    return () => setNote(null);
  }, [setNote, note]);
}
