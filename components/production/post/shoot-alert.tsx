import { ToneCallout } from "@/components/ui/tone-callout";
import { productionPost } from "@/lib/i18n/fr/production-post";
import type { ShootAlert as Alert } from "@/lib/production/post/types";

const fr = { productionPost };

const t = fr.productionPost.shoot;

/** What the shoot report left missing for the edit (declarations not made,
 * sequences missing) and the incidents said to block the postproduction:
 * read from the shoot, shown first, never decided here. */
export function ShootAlert({ alert }: { alert: Alert }) {
  const lines = [
    alert.noVideoRushes ? t.video : null,
    alert.noAudioSources ? t.audio : null,
    alert.noBackup ? t.backup : null,
    alert.missingSequences ? t.missingSequences(alert.missingSequences) : null,
    ...alert.blockingIncidents.map(t.incident),
  ].filter((line): line is string => line !== null);

  return (
    <ToneCallout tone="warning" role="note" className="whitespace-pre-line">
      <span className="font-semibold">{t.title}</span>
      {lines.map((line) => `\n· ${line}`).join("")}
    </ToneCallout>
  );
}
