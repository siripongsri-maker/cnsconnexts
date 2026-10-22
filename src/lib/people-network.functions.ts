import { createServerFn } from "@tanstack/react-start";
import type { NetworkConnection, NetworkPerson } from "./people-network";
import type { ConnectionStatus, Region } from "./types";

export type PublicPeopleNetworkSnapshot = {
  people: NetworkPerson[];
  connections: NetworkConnection[];
  available: boolean;
};

/** The public map projection; private tables and profile fields stay server-side. */
export const getPublicPeopleNetwork = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPeopleNetworkSnapshot> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const pageSize = 1000;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const regions = new Set<Region>([
        "North",
        "Northeast",
        "Central",
        "South",
        "Bangkok",
        "Nationwide",
      ]);
      const statuses = new Set<ConnectionStatus>([
        "Connected",
        "Planning",
        "In Progress",
        "Completed",
      ]);
      const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
      const record = (value: unknown): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value);
      const validId = (value: unknown): value is string =>
        typeof value === "string" && uuid.test(value);

      async function readPages(
        table: "participants" | "connections",
        columns: string,
      ): Promise<unknown[]> {
        const rows: unknown[] = [];
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await supabaseAdmin
            .from(table)
            .select(columns)
            .order("id", { ascending: true })
            .range(offset, offset + pageSize - 1);
          if (error || !Array.isArray(data) || data.length > pageSize) {
            throw new Error("Public network read failed");
          }
          rows.push(...data);
          if (data.length < pageSize) return rows;
        }
      }

      // These allowlists also limit what the privileged query can read.
      const [participantRows, connectionRows] = await Promise.all([
        readPages("participants", "id,name,province,region,interests,source"),
        readPages("connections", "user_a,user_b,status"),
      ]);
      const peopleById = new Map<string, NetworkPerson>();
      for (const row of participantRows) {
        if (
          !record(row) ||
          !validId(row["id"]) ||
          typeof row["name"] !== "string" ||
          !row["name"].trim() ||
          row["source"] === "demo"
        ) {
          continue;
        }
        const id = row["id"].toLowerCase();
        const interests = Array.isArray(row["interests"])
          ? [
              ...new Set(
                row["interests"].filter(
                  (interest): interest is string =>
                    typeof interest === "string" && !!interest.trim(),
                ),
              ),
            ].sort(compare)
          : [];
        const region = row["region"];
        peopleById.set(id, {
          id,
          name: row["name"],
          province: typeof row["province"] === "string" ? row["province"] : "",
          region: regions.has(region as Region) ? (region as Region) : "Nationwide",
          interests,
        });
      }

      const pairs = new Map<string, NetworkConnection>();
      const sharedTopics = new Map<string, Set<string>>();
      for (const row of connectionRows) {
        if (
          !record(row) ||
          !validId(row["user_a"]) ||
          !validId(row["user_b"]) ||
          !statuses.has(row["status"] as ConnectionStatus)
        ) {
          continue;
        }
        const [user_a, user_b] = [row["user_a"].toLowerCase(), row["user_b"].toLowerCase()].sort(
          compare,
        );
        if (!user_a || !user_b || user_a === user_b) continue;
        const source = peopleById.get(user_a);
        const target = peopleById.get(user_b);
        if (!source || !target) continue;
        const id = JSON.stringify([user_a, user_b]);
        const status = row["status"] as ConnectionStatus;
        const existing = pairs.get(id);
        // The database has an unordered-pair unique index. Fail closed if a
        // conflicting response ever violates that invariant.
        if (existing && existing.status !== status) throw new Error("Conflicting public pair");
        pairs.set(id, { id, user_a, user_b, status });
        const targetTopics = new Set(target.interests);
        for (const interest of source.interests) {
          if (!targetTopics.has(interest)) continue;
          for (const personId of [user_a, user_b]) {
            const topics = sharedTopics.get(personId) ?? new Set<string>();
            topics.add(interest);
            sharedTopics.set(personId, topics);
          }
        }
      }

      // Only shared topics leave this endpoint. Removing unshared topics does
      // not change the exact intersection displayed for any recorded pair.
      const people = [...peopleById.values()]
        .sort((a, b) => compare(a.id, b.id))
        .map((person) => ({
          id: person.id,
          name: person.name,
          province: person.province,
          region: person.region,
          interests: [...(sharedTopics.get(person.id) ?? [])].sort(compare),
        }));
      const connections = [...pairs.values()].sort((a, b) => compare(a.id, b.id));
      return { people, connections, available: true };
    } catch {
      console.error("getPublicPeopleNetwork failed");
      return { people: [], connections: [], available: false };
    }
  },
);
