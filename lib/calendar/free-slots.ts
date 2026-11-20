import "server-only";

import { toParisLocalInput } from "@/lib/calls/format";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/day";

/** A free slot, as the call form takes it: "YYYY-MM-DDTHH:mm" in Paris,
 * its end "HH:mm", and the hour shown on its button. */
export type FreeSlot = { local: string; end: string; label: string };

/** The free slots of one day, « Lun. 23/11/2026 ». */
export type FreeDay = { day: string; label: string; slots: FreeSlot[] };

/**
 * The free slots of a member who negotiates, for whoever plans his calls
 * (Ibé 18/11/2026: « aller voir les dispos du business manager sur son
 * agenda »): the next working days, on the hour from 10:00 to 18:00 Paris,
 * minus the calls PDS OS knows he is in. Computed by the database
 * (negotiator_free_slots): only the free slots leave it, never what fills
 * the others. His Google agenda is not read (docs/ARCHITECTURE.md § 4
 * quater: the domain's key reads only the connected member's own address).
 */
export async function loadNegotiatorFreeDays(
  personId: string,
): Promise<{ days: FreeDay[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("negotiator_free_slots", {
    p_person_id: personId,
  });
  if (error) {
    console.error("loadNegotiatorFreeDays:", error.message);
    return { days: [], error: true };
  }
  const days = new Map<string, FreeDay>();
  for (const row of data ?? []) {
    const local = toParisLocalInput(new Date(row.starts_at));
    const end = toParisLocalInput(new Date(row.ends_at)).slice(11);
    const day = local.slice(0, 10);
    const entry = days.get(day) ?? {
      day,
      label: formatDay(row.starts_at),
      slots: [],
    };
    entry.slots.push({ local, end, label: local.slice(11) });
    days.set(day, entry);
  }
  return { days: [...days.values()], error: false };
}
