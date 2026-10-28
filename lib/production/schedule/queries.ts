import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { createClient } from "@/lib/supabase/server";

import { SCHEDULE_SOURCES, type ScheduleDecision } from "./model";

/** The sheet's decisions of date and hours, newest first (the first one not
 * replaced is current). Read with the user's session, once per request. */
export const loadScheduleDecisions = trackedCache(
  async (sheetId: string): Promise<ScheduleDecision[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("production_schedule_decisions")
      .select(
        "shoot_on, starts_at, ends_at, source, decided_by, decided_at, replaced_at",
      )
      .eq("sheet_id", sheetId)
      .order("decided_at", { ascending: false });
    if (error) console.error("loadScheduleDecisions:", error.message);
    const rows = data ?? [];
    const ids = [
      ...new Set(rows.flatMap((r) => (r.decided_by ? [r.decided_by] : []))),
    ];
    const people = ids.length
      ? ((
          await supabase
            .from("people")
            .select("id, first_name, last_name")
            .in("id", ids)
        ).data ?? [])
      : [];
    const nameOf = (id: string | null) => {
      const p = people.find((x) => x.id === id);
      return p ? [p.first_name, p.last_name].filter(Boolean).join(" ") : null;
    };
    return rows.map((r) => ({
      date: r.shoot_on,
      start: r.starts_at.slice(0, 5),
      end: r.ends_at.slice(0, 5),
      source: SCHEDULE_SOURCES.find((s) => s === r.source) ?? "other",
      by: nameOf(r.decided_by),
      at: r.decided_at,
      replacedAt: r.replaced_at,
    }));
  },
);
