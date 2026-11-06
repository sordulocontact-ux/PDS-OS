import { legal } from "@/lib/i18n/fr/legal";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";

const fr = { legal };

/** The sentence under the contract's title in its démarche, when its
 * state asks for one (values still missing at their source). */
export function contractLead(row: Pick<AgreementRow, "state">): string | null {
  return row.state === "needs_info"
    ? fr.legal.panels.contract.needsInfoBody
    : null;
}
