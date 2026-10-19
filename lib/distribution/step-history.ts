import type { StepHistoryItem } from "@/components/shell/journey/step-history";
import { eventText } from "@/lib/distribution/history";
import type { DistributionStep } from "@/lib/ui/distribution-steps";

// Which step of the journey an event of distribution_events belongs to.
function stepOf(
  kind: string,
  data: Record<string, unknown>,
): DistributionStep | null {
  if (kind.startsWith("dossier.") || kind === "validator.set") return "params";
  if (kind.startsWith("check.") || kind.startsWith("version."))
    return "dossier";
  if (kind === "declaration.deposit") return "deposit";
  if (kind === "declaration.withdrawn")
    return data.kind === "deposit" ? "deposit" : "orchard";
  if (kind === "declaration.available" || kind.startsWith("platform."))
    return "platforms";
  if (kind.startsWith("declaration.") || kind === "corrections.declared")
    return "orchard";
  if (kind.startsWith("closure.")) return "closure";
  return null;
}

/**
 * « Déjà fait » of one step (docs/VISION-UX.md § 4): the module's journal
 * (written by the database only) filtered on that step, oldest first, each
 * gesture with who did it and when, and its note.
 */
export function stepHistory(
  ctx: {
    closure: {
      events: Array<{
        id: string;
        kind: string;
        data: Record<string, unknown>;
        actor: string | null;
        at: string;
      }>;
    };
  },
  step: DistributionStep,
): StepHistoryItem[] {
  return ctx.closure.events
    .filter((event) => stepOf(event.kind, event.data) === step)
    .map((event) => {
      const { text, note } = eventText(event.kind, event.data);
      return {
        key: event.id,
        text: note ? `${text} : « ${note} »` : text,
        who: event.actor,
        at: event.at,
      };
    })
    .reverse();
}
