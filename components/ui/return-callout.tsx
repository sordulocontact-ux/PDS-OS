import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";

/**
 * A validator's reason, signed, at the head of the step of the person who
 * has to answer it (proto `callout warn`): « **Claire Morel (demander une
 * modification)** : « … » ». `outcome`: the verb in lower case, as the
 * button said it.
 */
export function ReturnCallout({
  by,
  outcome,
  note,
}: {
  by: string;
  outcome: string;
  note: string;
}) {
  return (
    <ToneCallout tone="warning" as="div" role="note">
      <strong className="font-semibold">
        {fr.decisions.decision.returnBy(by, outcome)}
      </strong>{" "}
      : « {note} »
    </ToneCallout>
  );
}
