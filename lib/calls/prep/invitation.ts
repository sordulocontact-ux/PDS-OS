import "server-only";

import type { StoredPoint } from "@/lib/calls/prepare-schema";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

/**
 * The description of a prepared call's Google invitation: what the form
 * shows under « Envoyé avec l'invitation » (Sacha 28/10/2026). The
 * objective, the agenda with each point's duration, the documents by name,
 * then the module's own lines (Sujets, Points ouverts…).
 * PO's questions stay in PDS OS: they are the organizer's notes.
 */
export async function invitationText(input: {
  goal: string;
  agenda: StoredPoint[];
  documentIds: string[];
  facts: Array<{ label: string; value: string }>;
}): Promise<string> {
  const t = fr.callPrep.invitation;
  const total = input.agenda.reduce((sum, point) => sum + point.minutes, 0);
  const documents = await documentNames(input.documentIds);
  return [
    t.goal(input.goal),
    input.agenda.length > 0 &&
      [
        t.agenda(total),
        ...input.agenda.map((point, i) =>
          t.point(i + 1, point.topic, point.minutes),
        ),
      ].join("\n"),
    documents.length > 0 && t.documents(documents.join(", ")),
    ...input.facts.map((fact) => t.fact(fact.label, fact.value)),
    t.footer,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// The project files ticked in the form, by name (RLS: the user's session).
async function documentNames(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_files")
    .select("id, file_name")
    .in("id", ids);
  if (error) console.error("[calls] invitation documents:", error.message);
  return ids.flatMap((id) => {
    const file = data?.find((f) => f.id === id);
    return file ? [file.file_name] : [];
  });
}
