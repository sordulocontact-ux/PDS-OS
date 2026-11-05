import "server-only";

import { withOutcome } from "@/lib/journey/outcome";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * A gesture of the Juridique that says what follows (JUR-04): `done` in the
 * past participle (« Fiche validée »), who acts now and what opened, and the
 * viewer's own next step, on another page, opened for them with the banner
 * (ResultBanner, « Étape ouverte pour vous »). Code only (lib/journey/outcome).
 */
export function legalOutcome<R extends WriteResult>(
  projectId: string,
  done: string,
  write: () => Promise<R>,
): Promise<R> {
  // A write that already says something more precise (« Contrat envoyé par
  // e-mail », « Facture demandée à Claire ») keeps its own sentence.
  let own: string | undefined;
  return withOutcome(
    projectId,
    ["legal"],
    done,
    async () => {
      const result = await write();
      if (result.ok) own = result.done;
      return result;
    },
    { openNext: true },
  ).then((result) => (result.ok && own ? { ...result, done: own } : result));
}
