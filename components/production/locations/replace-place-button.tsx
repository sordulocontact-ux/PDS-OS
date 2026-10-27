"use client";

import { useState, type FormEvent } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { productionPlace } from "@/lib/i18n/fr/production-place";
import { replacePlace } from "@/lib/production/place-actions";

const fr = { dialogs, productionPlace };

const t = fr.productionPlace.replace;

export type ReplaceCandidate = {
  id: string;
  name: string;
  // « 1 400 € HT · dépasse de 400 € HT »
  detail: string;
  fit: { ok: boolean; text: string } | null;
};
export type ReviewHolder = {
  name: string;
  personId: string | null;
  contactId: string | null;
} | null;

/**
 * « Remplacer le lieu retenu » (proto replaceForm): the new place (its fit
 * with the quote), the reason (prefilled from the information it comes
 * from), the informations linked, decided with it, and « Ce qu'il faut
 * revoir » — each box a task for the right person, the quote's revision
 * checked when the new place costs more than planned.
 */
export function ReplacePlaceButton({
  projectId,
  current,
  candidates,
  notes,
  holders,
}: {
  projectId: string;
  current: string;
  candidates: ReplaceCandidate[];
  notes: { id: string; body: string; source: string }[];
  holders: {
    creative: ReviewHolder;
    gear: ReviewHolder;
    plan: ReviewHolder;
    budget: ReviewHolder;
  };
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<string | null>(candidates[0]?.id ?? null);
  const [linked, setLinked] = useState<string[]>(notes.map((n) => n.id));
  const chosen = candidates.find((c) => c.id === place) ?? null;
  const over = Boolean(chosen?.fit && !chosen.fit.ok);
  const [review, setReview] = useState<Record<string, boolean>>({
    creative: true,
    gear: true,
    plan: true,
    budget: over,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, error, run } = useWriteSubmit(
    () => setOpen(false),
    t.submit,
  );
  if (!open)
    return (
      <div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t.open}
        </Button>
      </div>
    );
  const keys = (["creative", "gear", "plan", "budget"] as const).filter(
    (k) => holders[k],
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    ).trim();
    const next: Record<string, string> = {};
    if (!chosen) next.place = t.errors.place;
    if (!reason) next.reason = t.errors.reason;
    setErrors(next);
    if (!chosen || !reason) return;
    const tasks = (["creative", "gear", "plan"] as const).flatMap((k) => {
      const h = holders[k];
      return review[k] && h
        ? [
            {
              title: t.tasks[k](chosen.name),
              person_id: h.personId,
              contact_id: h.contactId,
            },
          ]
        : [];
    });
    run(() =>
      replacePlace({
        projectId,
        optionId: chosen.id,
        names: { next: chosen.name, prev: current },
        reason,
        reviews: tasks,
        reviseQuote: Boolean(review.budget && holders.budget),
        reviseDirection: Boolean(review.creative && holders.creative),
        noteIds: linked,
      }),
    );
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl bg-[var(--surface-soft)] p-4"
    >
      <h3 className="font-semibold">{t.title(current)}</h3>
      <p className="text-[color:var(--text-secondary)]">{t.description}</p>
      {candidates.length === 0 ? (
        <p>{t.none}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <ChoiceCards<string>
            name="replace-place"
            legend={t.place}
            required
            variant="list"
            value={place}
            onChange={(v) => {
              setPlace(v);
              const fit = candidates.find((c) => c.id === v)?.fit;
              setReview((r) => ({ ...r, budget: Boolean(fit && !fit.ok) }));
            }}
            choices={candidates.map((c) => ({
              value: c.id,
              label: c.name,
              detail: c.detail,
              hint: c.fit?.text,
            }))}
          />
          <FieldError id="replace-place-error">{errors.place}</FieldError>
        </div>
      )}
      <TextareaField
        name="reason"
        label={t.reason}
        placeholder={t.reasonPlaceholder}
        required
        rows={2}
        maxLength={1000}
        defaultValue={notes.length === 1 ? notes[0].body : undefined}
        error={errors.reason}
      />
      {notes.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">{t.linked}</legend>
          <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
            {t.linkedHint}
          </p>
          {notes.map((n) => (
            <CheckboxField
              key={n.id}
              label={`« ${n.body} »`}
              hint={n.source}
              checked={linked.includes(n.id)}
              onChange={(on) =>
                setLinked((all) =>
                  on ? [...all, n.id] : all.filter((x) => x !== n.id),
                )
              }
            />
          ))}
        </fieldset>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">{t.review}</legend>
        <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
          {t.reviewHint}
        </p>
        {keys.map((k) => (
          <CheckboxField
            key={k}
            label={`${t.items[k]} ${t.to(holders[k]?.name ?? "—")}`}
            checked={review[k]}
            onChange={(on) => setReview((r) => ({ ...r, [k]: on }))}
          />
        ))}
      </fieldset>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          {fr.dialogs.cancel}
        </Button>
      </div>
    </form>
  );
}
