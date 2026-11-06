"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveDistributionFormats } from "@/lib/distribution/requirements-actions";
import { distribution } from "@/lib/i18n/fr/distribution";

const fr = { distribution };

const t = fr.distribution.requirements;

/** « Distribution »: what The Orchard asks of the audio files, read by the
 * Master's Brief. Optional: empty, the Brief says nothing of it. */
export function DistributionForm({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const submit = useWriteSubmit(() => undefined, t.saved);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit.run(() => saveDistributionFormats(value));
      }}
    >
      <TextareaField
        name="audio-formats"
        label={t.audioFormats}
        hint={t.audioFormatsHint}
        rows={2}
        maxLength={500}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <Button type="submit" className="self-start" disabled={submit.pending}>
        {t.save}
      </Button>
    </form>
  );
}
