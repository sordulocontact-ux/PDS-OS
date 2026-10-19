import "server-only";

import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// A milestone of the Stratégie that opens the pre-order (« pré-save trois
// semaines avant », « précommande »…). Nothing is deduced without one: no
// rule « 3 semaines avant » exists in a ticket (point à trancher,
// docs/CONTEXTE-PROJET.md § 2).
const PREORDER = /pr[ée][\s-]?save|pr[ée]commande|pre[\s-]?order/i;

export type PreorderProposal = { date: string; source: string };

/**
 * What PDS OS proposes for the pre-order (VISION-UX rule 1): the Stratégie's
 * milestone that says it, before the release, with its title as the source.
 * Null when the Stratégie says nothing: « À renseigner ».
 */
export async function preorderProposal(
  projectId: string,
  releaseDate: string | null,
): Promise<PreorderProposal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("milestones")
    .select("title, occurs_on, notes")
    .eq("project_id", projectId)
    .order("occurs_on");
  if (error) console.error("preorderProposal:", error.message);
  const found = (data ?? []).find(
    (m) =>
      (PREORDER.test(m.title) || PREORDER.test(m.notes ?? "")) &&
      (releaseDate === null || m.occurs_on < releaseDate),
  );
  return found
    ? {
        date: found.occurs_on,
        source: fr.distributionJourney.params.preorderSource(found.title),
      }
    : null;
}
