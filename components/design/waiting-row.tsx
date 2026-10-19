import { WaitingRows } from "@/components/shell/journey/now-waiting";
import type { JourneyActor, JourneyStep } from "@/lib/ui/journey";

/**
 * « En attente de **Lina Haddad** : désigner le responsable créatif »
 * (proto `waits()`): who the step waits for, in the step itself, for the
 * person who has nothing to do there. One row per actor (a sheet each).
 */
export function DesignWaits({
  step,
  actors,
}: {
  step: JourneyStep;
  actors: Array<JourneyActor | null>;
}) {
  const items = actors
    .filter((a): a is JourneyActor => Boolean(a && !a.viewer))
    .map((actor, i) => ({ step: { ...step, key: `${step.key}-${i}`, actor } }));
  if (items.length === 0) return null;
  return <WaitingRows items={items} />;
}
