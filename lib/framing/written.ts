import type { ActionResult } from "@/lib/framing/result";
import { framing } from "@/lib/i18n/fr/framing";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { framing };

/** A framing or strategy action's result, its error said in French, for a
 * dialog's useWriteSubmit (ReasonForm, DialogButton forms). */
export const written = (result: ActionResult): WriteResult =>
  result.ok ? result : { ok: false, error: fr.framing.errors[result.error] };

/** The same, awaited: `run(() => writtenOf(action(…)))`. */
export const writtenOf = async (
  pending: Promise<ActionResult>,
): Promise<WriteResult> => written(await pending);
