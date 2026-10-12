import { TitleAudioState } from "@/components/catalog/title/title-audio-state";
import { FactList } from "@/components/ui/fact-list";
import type { AudioOverview } from "@/lib/catalog/audio-versions";
import type { AudioState } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { formatInstant } from "@/lib/utils/instant";
import { versionLabel } from "@/components/catalog/master-page/audio/audio-version-list";

/**
 * Three separate facts (retours Catalogue 13 et 25): the step reached, the
 * last version deposited, the last one validated — they may differ.
 */
export function AudioSummary({
  state,
  finalValidated,
  overview,
}: {
  state: AudioState | null;
  finalValidated: boolean;
  overview: AudioOverview;
}) {
  const t = fr.masterPage.audio.versions.summary;
  const { latestDeposited: deposited, latestValidated: validated } = overview;
  return (
    <FactList
      emptyLabel={t.none}
      facts={[
        {
          label: t.reached,
          value: <TitleAudioState state={state} validated={finalValidated} />,
        },
        {
          label: t.latestDeposited,
          value: deposited
            ? `${versionLabel(deposited)} · ${formatInstant(deposited.createdAt)}`
            : null,
        },
        {
          label: t.latestValidated,
          value:
            validated && validated.reviewedAt
              ? `${versionLabel(validated)} · ${formatInstant(validated.reviewedAt)}`
              : null,
        },
      ]}
    />
  );
}
