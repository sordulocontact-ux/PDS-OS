import "server-only";

import { withOutcome } from "@/lib/journey/outcome";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * A gesture of the Juridique that says what follows (JUR-04): `done` in the
 * past participle (« Fiche validée »), who acts now and what opened, and the
 * viewer's own next step, on another page, opened for them with the banner
 * (ResultBanner, « Étape ouverte pour vous »). Code only (lib/journey/outcome).
 */
export function legalOutcome(
  projectId: string,
  done: string,
  write: () => Promise<WriteResult>,
): Promise<WriteResult> {
  return withOutcome(projectId, ["legal"], done, write, { openNext: true });
}
