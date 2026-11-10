import { ToneCallout } from "@/components/ui/tone-callout";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";

const fr = { strategyReleasePlan };

/** The generator is closed for now, and why (the journey beside it is the
 * way back). */
export function GeneratorLocked({
  reason,
  title,
}: {
  reason: string;
  // The document's own title (the Plan de sortie's by default).
  title?: string;
}) {
  return (
    <ToneCallout tone="neutral" as="div">
      <span>
        <strong className="font-semibold">
          {title ?? fr.strategyReleasePlan.locked.title}
        </strong>{" "}
        {reason}
      </span>
    </ToneCallout>
  );
}
