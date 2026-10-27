"use client";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { reclassifyAudioVersion } from "@/lib/catalog/master/audio-actions";
import {
  AUDIO_STATES,
  isAudioState,
  type AudioState,
} from "@/lib/catalog/title-rules";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { catalog, masterPage };

/** « Corriger l'étape » of a version deposited at the wrong step (retour
 * Catalogue 19): the numbers follow, the title too. */
export function AudioReclassifyForm({
  masterId,
  fileId,
  state,
  onDone,
}: {
  masterId: string;
  fileId: string;
  state: AudioState;
  onDone: () => void;
}) {
  const t = fr.masterPage.audio.versions;
  const { pending, error, run } = useWriteSubmit(onDone, t.reclassified);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const next = new FormData(event.currentTarget).get("audioState");
        if (!isAudioState(next) || next === state) return onDone();
        run(() => reclassifyAudioVersion({ masterId, fileId, state: next }));
      }}
    >
      <OptionSelect
        id={`reclassify-${fileId}`}
        name="audioState"
        label={t.reclassifyLabel}
        items={Object.fromEntries(
          AUDIO_STATES.map((value) => [value, fr.catalog.audioStates[value]]),
        )}
        defaultValue={state}
        required
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.reclassify}
        onCancel={onDone}
      />
    </form>
  );
}
