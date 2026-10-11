"use client";

import { IconPlus, IconXmark } from "nucleo-sharp-essential";

import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import {
  RESERVE_CATEGORIES,
  type ReserveCategory,
} from "@/lib/marketing/reports/model";

const t = fr.marketingReview.reports;
const p = t.preparation;

export type CustomReserve = {
  key: number;
  category: ReserveCategory;
  description: string;
};
type Custom = CustomReserve;

/**
 * The reserves a report will carry: those proposed by the code (ticked by
 * default, unticked to leave out) and the author's own, each with its
 * category. Nothing is created before « Générer ».
 */
export function ReserveDraftList({
  carried,
  proposed,
  onToggle,
  custom,
  onCustomChange,
}: {
  // Open reserves of the project: in the version as they are.
  carried: { id: string; label: string }[];
  proposed: { key: string; label: string; checked: boolean }[];
  onToggle: (key: string) => void;
  custom: Custom[];
  onCustomChange: (next: Custom[]) => void;
}) {
  const update = (key: number, change: Partial<Custom>) =>
    onCustomChange(
      custom.map((c) => (c.key === key ? { ...c, ...change } : c)),
    );
  return (
    <section
      aria-labelledby="reserves-title"
      className="grid gap-3 rounded-2xl border border-border p-4"
    >
      <div className="grid gap-0.5">
        <h2 id="reserves-title" className="text-base font-medium">
          {p.reserves}
        </h2>
        <p className="text-sm text-muted-foreground">{p.reservesHint}</p>
      </div>
      {carried.length > 0 && (
        <div className="grid gap-1">
          <h3 className="text-sm font-medium">{p.carried}</h3>
          <ul className="grid gap-1 text-sm text-muted-foreground">
            {carried.map((r) => (
              <li key={r.id}>{r.label}</li>
            ))}
          </ul>
        </div>
      )}
      {carried.length === 0 && proposed.length === 0 && custom.length === 0 && (
        <p className="text-sm text-muted-foreground">{p.nothing}</p>
      )}
      <ul className="grid gap-2">
        {proposed.map((r) => (
          <li key={r.key}>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={r.checked}
                onChange={() => onToggle(r.key)}
              />
              {r.label}
            </label>
          </li>
        ))}
      </ul>
      {custom.map((c) => (
        <div
          key={c.key}
          className="grid gap-2 rounded-xl border border-border p-3"
        >
          <OptionSelect
            id={`reserve-${c.key}-category`}
            name={`reserve-${c.key}-category`}
            label={p.reserveCategory}
            items={Object.fromEntries(
              RESERVE_CATEGORIES.map((k) => [k, t.reserveCategories[k]]),
            )}
            defaultValue={c.category}
            onValueChange={(value) => {
              const category = RESERVE_CATEGORIES.find((k) => k === value);
              if (category) update(c.key, { category });
            }}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`reserve-${c.key}-description`}>
              {p.reserveDescription}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`reserve-${c.key}-description`}
                value={c.description}
                maxLength={1000}
                onChange={(e) => update(c.key, { description: e.target.value })}
                className="h-10 text-base md:text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={p.removeReserve}
                onClick={() =>
                  onCustomChange(custom.filter((other) => other.key !== c.key))
                }
              >
                <IconXmark aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() =>
          onCustomChange([
            ...custom,
            {
              key: Math.max(0, ...custom.map((c) => c.key)) + 1,
              category: "other",
              description: "",
            },
          ])
        }
      >
        <IconPlus aria-hidden data-icon="inline-start" />
        {p.addReserve}
      </Button>
    </section>
  );
}
