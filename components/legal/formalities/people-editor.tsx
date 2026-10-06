"use client";

import { IconPlus, IconXmark } from "nucleo-sharp-essential";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  QUALITIES,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";
import {
  FULL,
  formatShare,
  totalUnits,
  unitsOf,
} from "@/lib/legal/splits/shares";

const blankCreator: Creator = {
  last_name: "",
  first_name: "",
  pseudonym: "",
  ipi: "",
  quality: "",
  phono: "",
  signs: true,
};
const blankPublisher: Publisher = { name: "", ipi: "", phono: "" };

/** Creators 1 to 5 and publishers 1 to 3, each with an exact Phono share;
 * the total of both groups is shown, and must be exactly 100 %. */
export function PeopleEditor({
  creators,
  publishers,
  disabled,
  onCreators,
  onPublishers,
}: {
  creators: Creator[];
  publishers: Publisher[];
  disabled: boolean;
  onCreators: (next: Creator[]) => void;
  onPublishers: (next: Publisher[]) => void;
}) {
  const t = fr.legalFormalities;
  const total = totalUnits(
    [...creators, ...publishers].map((p) =>
      unitsOf(p.phono.replace(",", ".") || "0"),
    ),
  );
  const setCreator = (i: number, change: Partial<Creator>) =>
    onCreators(creators.map((c, j) => (j === i ? { ...c, ...change } : c)));
  const setPublisher = (i: number, change: Partial<Publisher>) =>
    onPublishers(publishers.map((p, j) => (j === i ? { ...p, ...change } : p)));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t.notes.creators}</p>
      {creators.map((c, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-xl border p-3 sm:grid-cols-3"
        >
          <Field
            name={`c-last-${i}`}
            label={t.creator.lastName}
            value={c.last_name}
            disabled={disabled}
            onChange={(e) => setCreator(i, { last_name: e.target.value })}
          />
          <Field
            name={`c-first-${i}`}
            label={t.creator.firstName}
            value={c.first_name}
            disabled={disabled}
            onChange={(e) => setCreator(i, { first_name: e.target.value })}
          />
          <Field
            name={`c-pseudo-${i}`}
            label={t.creator.pseudonym}
            value={c.pseudonym}
            disabled={disabled}
            onChange={(e) => setCreator(i, { pseudonym: e.target.value })}
          />
          <Field
            name={`c-ipi-${i}`}
            label={t.creator.ipi}
            value={c.ipi}
            disabled={disabled}
            onChange={(e) => setCreator(i, { ipi: e.target.value })}
          />
          <OptionSelect
            name={`c-quality-${i}`}
            label={t.creator.quality}
            items={Object.fromEntries(
              QUALITIES.map((q) => [q, t.qualities[q]]),
            )}
            defaultValue={c.quality || null}
            onValueChange={(v) =>
              setCreator(i, { quality: v as Creator["quality"] })
            }
          />
          <Field
            name={`c-phono-${i}`}
            label={t.creator.phono}
            inputMode="decimal"
            suffix="%"
            value={c.phono.replace(".", ",")}
            disabled={disabled}
            onChange={(e) =>
              setCreator(i, { phono: e.target.value.replace(",", ".") })
            }
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="size-4 accent-selection"
              checked={c.signs}
              disabled={disabled}
              onChange={(e) => setCreator(i, { signs: e.target.checked })}
            />
            {t.creator.signs}
          </label>
          {!disabled && (
            <Button
              size="sm"
              variant="ghost"
              className="justify-self-end"
              onClick={() => onCreators(creators.filter((_, j) => j !== i))}
            >
              <IconXmark aria-hidden />
              {t.creator.remove}
            </Button>
          )}
        </div>
      ))}
      {publishers.map((p, i) => (
        <div
          key={`p${i}`}
          className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_auto] sm:items-end"
        >
          <Field
            name={`p-name-${i}`}
            label={t.publisher.name}
            value={p.name}
            disabled={disabled}
            onChange={(e) => setPublisher(i, { name: e.target.value })}
          />
          <Field
            name={`p-ipi-${i}`}
            label={t.publisher.ipi}
            value={p.ipi}
            disabled={disabled}
            onChange={(e) => setPublisher(i, { ipi: e.target.value })}
          />
          <Field
            name={`p-phono-${i}`}
            label={t.publisher.phono}
            inputMode="decimal"
            suffix="%"
            value={p.phono.replace(".", ",")}
            disabled={disabled}
            onChange={(e) =>
              setPublisher(i, { phono: e.target.value.replace(",", ".") })
            }
          />
          {!disabled && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={t.creator.remove}
              onClick={() => onPublishers(publishers.filter((_, j) => j !== i))}
            >
              <IconXmark aria-hidden />
            </Button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!disabled && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={creators.length >= 5}
              onClick={() => onCreators([...creators, blankCreator])}
            >
              <IconPlus aria-hidden />
              {t.creator.add}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={publishers.length >= 3}
              onClick={() => onPublishers([...publishers, blankPublisher])}
            >
              <IconPlus aria-hidden />
              {t.publisher.add}
            </Button>
          </div>
        )}
        <span
          className={
            total === FULL
              ? "font-medium"
              : "font-medium text-[color:var(--tone-warning-fg)]"
          }
        >
          {t.creator.phono} : {formatShare(total)}
        </span>
      </div>
    </div>
  );
}
