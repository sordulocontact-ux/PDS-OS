"use client";

import { fieldLabel } from "@/components/contracts/templates/field-chip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import {
  CONTRACT_FIELD_IDS,
  type ContractFieldId,
} from "@/lib/legal/contracts/fields";

const fr = { legalContracts };

const FIELD_ITEMS = Object.fromEntries(
  CONTRACT_FIELD_IDS.map((id) => [id, fieldLabel(id)]),
);

/** One value found in the contract: the excerpt, how often it is written,
 * its field (still changeable once replaced) and what to do with it. */
export function ValueSuggestionRow({
  excerpt,
  field,
  count,
  replacedCount,
  onField,
  onReplace,
  onUndo,
  onIgnore,
}: {
  excerpt: string;
  field: ContractFieldId;
  count: number;
  replacedCount: number | null;
  onField: (field: ContractFieldId) => void;
  onReplace: () => void;
  onUndo: () => void;
  onIgnore: () => void;
}) {
  const t = fr.legalContracts.templates.values;
  const replaced = replacedCount !== null;
  return (
    <li className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium break-words">« {excerpt} »</span>
        <span className="text-sm text-muted-foreground">
          {replaced
            ? t.replaced(replacedCount)
            : count > 0
              ? t.times(count)
              : t.gone}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(replaced || count > 0) && (
          <Select
            items={FIELD_ITEMS}
            value={field}
            onValueChange={(next) =>
              typeof next === "string" && onField(next as ContractFieldId)
            }
          >
            <SelectTrigger size="sm" aria-label={t.fieldLabel(excerpt)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_FIELD_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {FIELD_ITEMS[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {replaced ? (
          <Button type="button" variant="ghost" size="xs" onClick={onUndo}>
            {t.undo}
          </Button>
        ) : (
          <>
            {count > 0 && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onReplace}
              >
                {t.replace}
              </Button>
            )}
            <Button type="button" variant="ghost" size="xs" onClick={onIgnore}>
              {t.ignore}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
