import { ToneCallout } from "@/components/ui/tone-callout";
import type { FramingReadiness as Readiness } from "@/lib/framing/readiness";
import { briefRequests } from "@/lib/i18n/fr/brief-requests";

const fr = { briefRequests };

/**
 * Next to the Brief: the Cadrage's completeness and its operational
 * prerequisites, said apart (PROJ-UX-06): complete does not mean ready.
 */
export function FramingReadiness({ readiness }: { readiness: Readiness }) {
  const t = fr.briefRequests.readiness;
  const { total, satisfied, open } = readiness.prerequisites;
  const ready = readiness.complete && open.length === 0;
  return (
    <ToneCallout tone={ready ? "success" : "neutral"}>
      <span className="flex flex-col gap-1">
        <span className="font-semibold">
          {readiness.complete ? t.complete : t.incomplete} ·{" "}
          {total > 0 ? t.prerequisites(satisfied, total) : t.noPrerequisites}
        </span>
        {open.length > 0 && <span>{t.open(open)}</span>}
        {readiness.complete && open.length > 0 && <span>{t.hint}</span>}
      </span>
    </ToneCallout>
  );
}
