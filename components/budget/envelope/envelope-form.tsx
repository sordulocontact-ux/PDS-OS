"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { ArtistEnvelope } from "@/lib/budget/envelope";
import { saveArtistEnvelope } from "@/lib/budget/envelope-actions";
import {
  BUDGET_FAMILIES,
  centsToInput,
  formatEuros,
  isBudgetFamily,
  type BudgetFamily,
} from "@/lib/budget/types";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { budget } from "@/lib/i18n/fr/budget";
import { todayInParis } from "@/lib/insights/dates";
import { parseEurosToCents } from "@/lib/projects/schemas";

const fr = { artistBudget, budget };

type Post = { family: BudgetFamily; amount: string };

const cents = (value: string) => {
  const parsed = parseEurosToCents(value);
  return parsed === null || parsed === undefined || parsed <= 0 ? null : parsed;
};

/**
 * Opens, renews or changes an artist's envelope (BUD 2, the direction): an
 * amount, a first day, an optional last day, the amount of each poste
 * chosen. What is known is filled in (a new envelope starts from the
 * current one's split); the postes never add up to more than the amount,
 * said before saving.
 */
export function EnvelopeForm({
  artistId,
  current,
  mode,
  onDone,
}: {
  artistId: string;
  current: ArtistEnvelope | null;
  // « edit »: the open envelope; « open » / « reopen »: a new one.
  mode: "open" | "reopen" | "edit";
  onDone: () => void;
}) {
  const t = fr.artistBudget.form;
  const root = useRef<HTMLFormElement>(null);
  const submit = useWriteSubmit(onDone, "");
  const [amount, setAmount] = useState(
    current ? centsToInput(current.amountCents) : "",
  );
  const [startsOn, setStartsOn] = useState(
    mode === "edit" && current ? current.startsOn : todayInParis(),
  );
  const [endsOn, setEndsOn] = useState(
    mode === "edit" ? (current?.endsOn ?? "") : "",
  );
  const [posts, setPosts] = useState<Post[]>(
    BUDGET_FAMILIES.flatMap((family) => {
      const value = current?.posts[family];
      return value ? [{ family, amount: centsToInput(value) }] : [];
    }),
  );
  const [tried, setTried] = useState(false);

  const total = cents(amount);
  const allotted = posts.reduce((sum, p) => sum + (cents(p.amount) ?? 0), 0);
  const over = total !== null && allotted > total ? allotted - total : 0;
  const errors = {
    amount: total === null ? t.amountMissing : undefined,
    startsOn: startsOn ? undefined : t.startsOnMissing,
    endsOn:
      endsOn && startsOn && endsOn < startsOn ? t.endsOnBefore : undefined,
    posts: posts.filter((p) => cents(p.amount) === null).length,
  };
  const missing =
    [errors.amount, errors.startsOn, errors.endsOn].filter(Boolean).length +
    errors.posts;
  const free = BUDGET_FAMILIES.filter(
    (f) => !posts.some((p) => p.family === f),
  );

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (missing > 0 || over > 0) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    submit.run(() =>
      saveArtistEnvelope({
        artistId,
        budgetId: mode === "edit" ? current?.id : undefined,
        amount,
        startsOn,
        endsOn,
        posts: Object.fromEntries(posts.map((p) => [p.family, p.amount])),
      }),
    );
  }

  return (
    <form ref={root} noValidate onSubmit={send} className="flex flex-col gap-5">
      <Field
        name="envelope-amount"
        label={t.amount}
        aria-required
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        error={tried ? errors.amount : undefined}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="envelope-starts-on"
          type="date"
          label={t.startsOn}
          aria-required
          value={startsOn}
          error={tried ? errors.startsOn : undefined}
          onChange={(e) => setStartsOn(e.target.value)}
        />
        <Field
          name="envelope-ends-on"
          type="date"
          label={t.endsOn}
          min={startsOn || undefined}
          value={endsOn}
          error={tried ? errors.endsOn : undefined}
          onChange={(e) => setEndsOn(e.target.value)}
        />
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-[length:var(--type-body-md)] font-medium">
          {t.postsTitle}
        </legend>
        {posts.map((post, index) => (
          <div key={post.family} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field
                name={`envelope-post-${post.family}`}
                label={t.postAmount(fr.budget.families[post.family])}
                inputMode="decimal"
                autoComplete="off"
                aria-required
                value={post.amount}
                error={
                  tried && cents(post.amount) === null
                    ? t.postInvalid
                    : undefined
                }
                onChange={(e) =>
                  setPosts(
                    posts.map((p, i) =>
                      i === index ? { ...p, amount: e.target.value } : p,
                    ),
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label={t.removePost(fr.budget.families[post.family])}
              onClick={() => setPosts(posts.filter((_, i) => i !== index))}
            >
              <IconTrash aria-hidden />
            </Button>
          </div>
        ))}
        {free.length > 0 && (
          <div className="grid gap-1.5">
            <Label htmlFor="envelope-add-post">{t.addPost}</Label>
            <SearchSelect
              id="envelope-add-post"
              label={t.addPost}
              options={{
                "": t.choosePost,
                ...Object.fromEntries(
                  free.map((f) => [f, fr.budget.families[f]]),
                ),
              }}
              value=""
              onChange={(family) =>
                isBudgetFamily(family) &&
                setPosts([...posts, { family, amount: "" }])
              }
              searchPlaceholder={fr.budget.form.familySearch}
              emptyLabel={fr.budget.form.familyNone}
              fill
            />
          </div>
        )}
        {total !== null && (
          <p
            className={
              over > 0
                ? "text-caption text-error"
                : "text-caption text-[color:var(--text-secondary)] tabular-nums"
            }
          >
            {over > 0
              ? t.overTotal(formatEuros(over))
              : t.allotted(
                  formatEuros(allotted),
                  formatEuros(total),
                  formatEuros(total - allotted),
                )}
          </p>
        )}
      </fieldset>
      {tried && missing > 0 && (
        <FormMessage kind="error">{t.missingCount(missing)}</FormMessage>
      )}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onCancel={onDone}
      />
    </form>
  );
}
