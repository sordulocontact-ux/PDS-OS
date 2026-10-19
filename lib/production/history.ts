import "server-only";

import { fr } from "@/lib/i18n/fr";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { createClient } from "@/lib/supabase/server";

import { describeEvent, actorless, type HistoryEvent } from "./history-text";

export type HistoryLine = {
  id: string;
  at: string;
  who: string | null;
  text: string;
};

const record = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;

/** The sheet's activity log, newest first, each line written by code
 * (PROD-002, PROD-008). Names from the sheet's members and Réseau. */
export async function loadProductionHistory(
  sheetId: string,
  data: Pick<ProductionSheetData, "members" | "contacts">,
  // Only these events (« entity.action »): the changes of role of « Qui
  // fait quoi ».
  only?: string[],
): Promise<HistoryLine[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("production_events")
    .select("id, entity, action, before, after, actor_person_id, at")
    .eq("sheet_id", sheetId)
    .order("at", { ascending: false })
    .limit(500);
  if (error) console.error("loadProductionHistory:", error.message);
  const t = fr.productionHistory;
  const person = (id: string | null) =>
    id
      ? (data.members.find((m) => m.personId === id)?.name ?? t.someone)
      : null;
  const holder = (value: unknown) => {
    const h = record(value);
    if (!h) return t.nobody;
    return h.kind === "person"
      ? (person(String(h.id)) ?? t.someone)
      : (data.contacts.find((c) => c.id === h.id)?.name ?? t.someone);
  };
  return (rows ?? []).flatMap((row) => {
    if (only && !only.includes(`${row.entity}.${row.action}`)) return [];
    const event: HistoryEvent = {
      id: row.id,
      entity: row.entity,
      action: row.action,
      before: record(row.before),
      after: record(row.after),
      actorName: person(row.actor_person_id),
      at: row.at,
    };
    const text = describeEvent(event, {
      holder,
      person: (id) => person(typeof id === "string" ? id : null) ?? t.someone,
    });
    if (!text) return [];
    return [
      {
        id: row.id,
        at: row.at,
        who: actorless(event) ? null : (event.actorName ?? t.provider),
        text,
      },
    ];
  });
}
