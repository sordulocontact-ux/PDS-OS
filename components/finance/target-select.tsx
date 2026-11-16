"use client";

import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { treasury } from "@/lib/i18n/fr/treasury";

const fr = { treasury };

/**
 * A project, an artist, a deal or a member named by a Finance form, from
 * finance_targets (names only): the live ones, alphabetically, plus the
 * one already chosen even when archived; « Aucun » first.
 */
export function TargetSelect({
  id,
  label,
  kind,
  targets,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  kind: FinanceTarget["kind"];
  targets: FinanceTarget[];
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const t = fr.treasury.incomeForm;
  const options = {
    "": t.none,
    ...Object.fromEntries(
      targets
        .filter((x) => x.kind === kind && (!x.archived || x.id === value))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
        .map((x) => [x.id, x.name]),
    ),
  };
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <SearchSelect
        id={id}
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        searchPlaceholder={t.search}
        emptyLabel={t.noMatch}
        fill
      />
      {hint && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {hint}
        </p>
      )}
    </div>
  );
}
