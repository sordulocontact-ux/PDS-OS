import "server-only";

import { fr } from "@/lib/i18n/fr";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// « Déjà fait » of a contract: every event of its journal (contract_events,
// written by SQL only), newest first, whoever wrote it or generated it — a
// contract written by hand has one too. Read with the viewer's session
// (RLS: can_see_contract).

export type ContractEvent = {
  id: string;
  kind: string;
  label: string;
  by: string;
  at: string;
  note: string | null;
};

export async function loadContractJournal(
  contractId: string,
): Promise<ContractEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_events")
    .select("id, kind, actor_person_id, note, created_at")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) console.error("loadContractJournal:", error.message);
  const rows = data ?? [];
  const ids = [
    ...new Set(
      rows.flatMap((e) => (e.actor_person_id ? [e.actor_person_id] : [])),
    ),
  ];
  const { data: people } = ids.length
    ? await supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", ids)
    : { data: [] };
  const nameOf = new Map(
    (people ?? []).map((p) => [p.id, personName(p.first_name, p.last_name)]),
  );
  return rows.map((e) => ({
    id: e.id,
    kind: e.kind,
    label: fr.legalContracts.document.events[e.kind] ?? e.kind,
    by: (e.actor_person_id && nameOf.get(e.actor_person_id)) || "",
    at: e.created_at,
    note: e.note,
  }));
}
