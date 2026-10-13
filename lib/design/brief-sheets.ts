import "server-only";

import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// What the Brief créatif says of each Fiche Livrable (MKT-C2-12): who is
// responsible and who decides, its delivery date, and for a series its
// contents with their own concept, responsible and date. Read with the
// user's session (RLS).

export type BriefSheet = {
  // design_deliverables.id
  deliverableId: string;
  kind: "single" | "series";
  responsible: string | null;
  validators: string[];
  deliveryDate: string | null;
  items: Array<{
    number: number;
    title: string;
    concept: string | null;
    responsible: string | null;
    deliveryDate: string | null;
  }>;
};

export async function loadBriefSheets(
  projectId: string,
): Promise<BriefSheet[]> {
  const supabase = await createClient();
  const [sheets, items, assignments, validators] = await Promise.all([
    supabase
      .from("design_sheets")
      .select("id, design_deliverable_id, kind, delivery_date")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("design_sheet_items")
      .select(
        "sheet_id, number, title, concept, responsible_person_id, delivery_date",
      )
      .eq("project_id", projectId)
      .order("number"),
    supabase
      .from("design_assignments")
      .select("sheet_id, person_id")
      .eq("project_id", projectId)
      .eq("scope", "sheet")
      .is("ended_at", null),
    supabase
      .from("design_validators")
      .select("sheet_id, person_id")
      .eq("project_id", projectId)
      .eq("scope", "sheet"),
  ]);
  const ids = [
    ...(assignments.data ?? []).map((a) => a.person_id),
    ...(validators.data ?? []).map((v) => v.person_id),
    ...(items.data ?? []).flatMap((i) =>
      i.responsible_person_id ? [i.responsible_person_id] : [],
    ),
  ];
  const { data: people } = ids.length
    ? await supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", [...new Set(ids)])
    : { data: [] };
  const name = (id: string | null) => {
    const p = (people ?? []).find((x) => x.id === id);
    return p ? personName(p.first_name, p.last_name) : null;
  };
  return (sheets.data ?? []).map((s) => ({
    deliverableId: s.design_deliverable_id,
    kind: s.kind === "series" ? "series" : "single",
    responsible: name(
      (assignments.data ?? []).find((a) => a.sheet_id === s.id)?.person_id ??
        null,
    ),
    validators: (validators.data ?? [])
      .filter((v) => v.sheet_id === s.id)
      .flatMap((v) => {
        const n = name(v.person_id);
        return n ? [n] : [];
      }),
    deliveryDate: s.delivery_date,
    items: (items.data ?? [])
      .filter((i) => i.sheet_id === s.id)
      .map((i) => ({
        number: i.number,
        title: i.title,
        concept: i.concept,
        responsible: name(i.responsible_person_id),
        deliveryDate: i.delivery_date,
      })),
  }));
}
