import { createServerFn } from "@tanstack/react-start";

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const empty = { participants: 0, ideas: 0, connections: 0 };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [p, i, c] = await Promise.all([
      supabaseAdmin.from("participants").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ideas").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("connections").select("*", { count: "exact", head: true }),
    ]);

    return {
      participants: p.count ?? 0,
      ideas: i.count ?? 0,
      connections: c.count ?? 0,
    };
  } catch (error) {
    console.error("getPublicStats failed", error);
    return empty;
  }
});
