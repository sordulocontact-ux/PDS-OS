"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ChipChoice } from "@/components/ui/chip-choice";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { InfluenceData } from "@/lib/activations/influence/queries";
import { saveRights } from "@/lib/activations/influence/rights-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationInfluence.rights;

/** One rights block : edited while proposed (`editing`), else saved as a new
 * version starting from the current terms. */
export function RightsForm({
  projectId,
  activationId,
  targetId,
  kind,
  current,
  editing,
  onDone,
}: {
  projectId: string;
  activationId: string;
  targetId: string;
  kind: "organic" | "ads";
  current: InfluenceData["rights"][number] | null;
  editing: boolean;
  onDone: () => void;
}) {
  const [remuneration, setRemuneration] = useState<"included" | "additional">(
    (current?.remuneration as "included" | "additional") ?? "included",
  );
  const [modification, setModification] = useState(
    current?.modification_allowed ?? false,
  );
  const [credit, setCredit] = useState(current?.credit_required ?? true);
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (k: string) => String(data.get(k) ?? "");
        run(() =>
          saveRights({
            projectId,
            activationId,
            targetId,
            rightsId: editing && current ? current.id : null,
            kind,
            platforms: text("platforms")
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean),
            supports: text("supports"),
            territory: text("territory"),
            startsOn: text("startsOn"),
            endsOn: text("endsOn"),
            remuneration,
            remunerationNote: text("remunerationNote"),
            modificationAllowed: modification,
            creditRequired: credit,
            restrictions: text("restrictions"),
          }),
        );
      }}
    >
      <p className="text-sm text-muted-foreground">{t.kindHints[kind]}</p>
      <Field
        name="platforms"
        label={t.platforms}
        hint={t.platformsHint}
        defaultValue={current?.platforms.join(", ") ?? ""}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="supports"
          label={t.supports}
          maxLength={500}
          defaultValue={current?.supports ?? ""}
        />
        <Field
          name="territory"
          label={t.territory}
          maxLength={200}
          defaultValue={current?.territory ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="startsOn"
          type="date"
          label={t.startsOn}
          defaultValue={current?.starts_on ?? ""}
        />
        <Field
          name="endsOn"
          type="date"
          label={t.endsOn}
          defaultValue={current?.ends_on ?? ""}
        />
      </div>
      <ChipChoice
        name="remuneration"
        legend={t.remuneration}
        value={remuneration}
        onChange={(v) => setRemuneration(v ?? "included")}
        options={(["included", "additional"] as const).map((r) => ({
          value: r,
          label: t.remunerations[r],
        }))}
      />
      <Field
        name="remunerationNote"
        label={t.remunerationNote}
        maxLength={500}
        defaultValue={current?.remuneration_note ?? ""}
      />
      <CheckboxField
        label={t.modification}
        checked={modification}
        onChange={setModification}
      />
      <CheckboxField label={t.credit} checked={credit} onChange={setCredit} />
      <TextareaField
        name="restrictions"
        label={t.restrictions}
        rows={2}
        maxLength={2000}
        defaultValue={current?.restrictions ?? ""}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : fr.activationWork.sheet.save}
        </Button>
      </div>
    </form>
  );
}
