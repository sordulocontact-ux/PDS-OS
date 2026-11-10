"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { DependencyOptions } from "@/lib/activations/dependency-options";
import { DEPENDENCY_KINDS, type DependencyKind } from "@/lib/activations/model";
import { linkDependency } from "@/lib/activations/pilot-actions";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations };

const t = fr.activations.dependencies;

/** « Rattacher » a deliverable, a contract, a borrowing or a task of the
 * project ; blocking by default. */
export function DependencyForm({
  projectId,
  activationId,
  options,
  onDone,
}: {
  projectId: string;
  activationId: string;
  options: DependencyOptions;
  onDone: () => void;
}) {
  const kinds = DEPENDENCY_KINDS.filter((k) => options[k].length > 0);
  const [kind, setKind] = useState<DependencyKind | null>(kinds[0] ?? null);
  const [blocking, setBlocking] = useState(true);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.linked);
  if (!kind)
    return <p className="text-body-sm text-muted-foreground">{t.noOption}</p>;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const objectId = String(
          new FormData(event.currentTarget).get("object") ?? "",
        );
        setMissing(!objectId);
        if (!objectId) return;
        run(() =>
          linkDependency({ projectId, activationId, kind, objectId, blocking }),
        );
      }}
    >
      <OptionSelect
        name="kind"
        label={t.kind}
        required
        items={Object.fromEntries(kinds.map((k) => [k, t.kinds[k]]))}
        defaultValue={kind}
        onValueChange={(v) => setKind(v as DependencyKind)}
      />
      <OptionSelect
        key={kind}
        name="object"
        label={t.object}
        required
        items={Object.fromEntries(options[kind].map((o) => [o.id, o.label]))}
        error={missing ? fr.activations.errors.invalid : undefined}
      />
      <CheckboxField
        label={t.blocking}
        hint={t.blockingHint}
        checked={blocking}
        onChange={setBlocking}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.add}
        </Button>
      </div>
    </form>
  );
}
