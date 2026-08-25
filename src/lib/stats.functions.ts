import { createServerFn } from "@tanstack/react-start";

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [
    { count: participants, error: pErr },
    { count: ideas, error: iErr },
    { count: connections, error: cErr },
  ] = await Promise.all([
    supabaseAdmin.from("participants").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("ideas").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("connections").select("*", { count: "exact", head: true }),
  ]);

  if (pErr) throw pErr;
  if (iErr) throw iErr;
  if (cErr) throw cErr;

  return {
    participants: participants ?? 0,
    ideas: ideas ?? 0,
    connections: connections ?? 0,
  };
});
