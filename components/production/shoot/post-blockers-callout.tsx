import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { PostBlocker } from "@/lib/production/shoot/blockers";

const t = fr.productionShoot.files;

const blockerText = (blocker: PostBlocker) =>
  blocker.kind === "declaration"
    ? t.blockers[blocker.key]
    : t.blockers.incident(blocker.title);

/** What the postproduction's preparation waits for after the shoot (a
 * missing declaration, an incident marked as blocking); nothing when
 * nothing blocks. */
export function PostBlockersCallout({ blockers }: { blockers: PostBlocker[] }) {
  if (blockers.length === 0) return null;
  return (
    <ToneCallout tone="danger">
      <span className="font-semibold">{t.postBlockedTitle}</span>
      {" · "}
      {t.postBlocked} {blockers.map(blockerText).join(" ; ")}.
    </ToneCallout>
  );
}
