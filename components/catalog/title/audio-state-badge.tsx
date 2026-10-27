import { StatusBadge } from "@/components/ui/status-badge";
import type { AudioState } from "@/lib/catalog/title-rules";
import { catalog } from "@/lib/i18n/fr/catalog";
import { audioStateTone } from "@/lib/ui/state-tones";

const fr = { catalog };

/** How far a title (or one of its audio files) has come: Maquette… Master final. */
export function AudioStateBadge({
  state,
  size,
}: {
  state: AudioState;
  size?: "sm" | "md";
}) {
  return (
    <StatusBadge tone={audioStateTone[state]} size={size}>
      {fr.catalog.audioStates[state]}
    </StatusBadge>
  );
}
