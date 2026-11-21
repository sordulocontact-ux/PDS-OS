import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { loadAgreements, type Agreements } from "@/lib/legal/contracts/queries";
import { agreementsToGenerate } from "@/lib/legal/title-contracts-rules";
import { createClient } from "@/lib/supabase/server";

// « Dès que les prérequis d'un accord sont disponibles, PO duplique le
// template compatible » (ticket Juridique 03, made automatic on 07/10/2026):
// every agreement whose template is validated and whose values are all at
// their source becomes its contract, without a click. It runs where the
// agreements are looked at (the Contrats and Suivi pages, the mapping's
// approval), with the viewer's session: the SQL function checks the rights,
// the values and that it was not already done. A value is still never
// typed here; the contract still has to be submitted and validated.

/** What generate_legal_contract receives: each value with its source. */
export function contractFieldsOf(row: AgreementRow) {
  const sources = fr.legalContracts.sources;
  return Object.fromEntries(
    row.fields.map((f) => [
      f.id,
      { value: f.value, source: f.source ? sources[f.source] : "" },
    ]),
  );
}

/** Generates the agreements that are ready; how many were. A guest artist's
 * waiting for their accord (Ibé, 18/11/2026, § 3.5) is left out before the
 * database is asked; its refusal, if it comes anyway (the accord changed
 * since the page was read), is the same expected skip. */
export async function generateReadyAgreements(
  agreements: Agreements,
  access: Access,
): Promise<number> {
  if (!can(access, "manage_contracts")) return 0;
  const ready = agreementsToGenerate(agreements.rows);
  if (ready.length === 0) return 0;
  const supabase = await createClient();
  let made = 0;
  for (const row of ready) {
    const { error } = await supabase.rpc("generate_legal_contract", {
      p_need_id: row.needId!,
      p_fields: contractFieldsOf(row),
      p_automatic: true,
    });
    if (!error) made += 1;
    // Another tab did it at the same moment: nothing to say.
    else if (
      !error.message.includes("agreement_already_generated") &&
      !error.message.includes("agreement_not_validated")
    )
      console.error("generateReadyAgreements:", error.message);
  }
  return made;
}

/** The project's agreements, the ready ones generated first. */
export async function loadAgreementsGenerated(
  project: Parameters<typeof loadAgreements>[0],
  access: Access,
): Promise<Agreements> {
  const agreements = await loadAgreements(project, access);
  return (await generateReadyAgreements(agreements, access)) > 0
    ? loadAgreements(project, access)
    : agreements;
}
