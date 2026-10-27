import { AudioStateBadge } from "@/components/catalog/title/audio-state-badge";
import type { AudioState } from "@/lib/catalog/title-rules";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

/**
 * Where a title stands in a list: the audio step reached, and « validé »
 * once its Master final was approved (retours Catalogue 01 et 13: a deposit
 * is not a validation). « Non renseigné » when nothing says it.
 */
export function TitleAudioState({
  state,
  validated,
}: {
  state: AudioState | null;
  validated: boolean;
}) {
  if (!state)
    return (
      <span className="text-[color:var(--text-tertiary)]">
        {fr.catalog.audioStateUnknown}
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <AudioStateBadge state={state} size="sm" />
      {validated && (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {fr.catalog.masters.validated}
        </span>
      )}
    </span>
  );
}
