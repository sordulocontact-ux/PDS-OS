"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { closeActivation } from "@/lib/activations/actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.activations.closure;

type Kind = "definitive" | "with_reserves";

/**
 * « Clôturer » : the reserves listed by code are shown and kept as shown ;
 * with reserves the closure is « avec réserves » by default, a definitive one
 * despite them needs a written reason (ticket RP : « Une clôture définitive
 * malgré des réserves exige un motif explicite »).
 */
export function ClosureForm({
  projectId,
  activationId,
  reserves,
  onDone,
}: {
  projectId: string;
  activationId: string;
  reserves: { key: string; count?: number; label: string }[];
  onDone: () => void;
}) {
  const has = reserves.length > 0;
  const [kind, setKind] = useState<Kind>(has ? "with_reserves" : "definitive");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.closed);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        ).trim();
        const needed = has && kind === "definitive" && !note;
        setMissing(needed);
        if (needed) return;
        run(() =>
          closeActivation({ projectId, activationId, kind, reserves, note }),
        );
      }}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.reserves}</h3>
        {has ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {reserves.map((r) => (
              <li key={r.key}>{r.label}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noReserves}</p>
        )}
      </div>
      {has && (
        <ChoiceCards
          name="kind"
          legend={t.kindLegend}
          required
          value={kind}
          onChange={setKind}
          choices={(["with_reserves", "definitive"] as const).map((k) => ({
            value: k,
            label: t.kinds[k],
          }))}
        />
      )}
      <TextareaField
        name="note"
        label={t.note}
        required={has && kind === "definitive"}
        rows={2}
        maxLength={2000}
        error={missing ? t.noteRequired : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.close}
        </Button>
      </div>
    </form>
  );
}
