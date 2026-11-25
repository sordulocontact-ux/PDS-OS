"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { fieldLabelOf } from "@/lib/legal/contracts/document-layout";
import {
  CONTRACT_FIELD_IDS,
  type ContractFieldId,
} from "@/lib/legal/contracts/fields";

const fr = { legalContracts };

const FIELD_ITEMS = Object.fromEntries(
  CONTRACT_FIELD_IDS.map((id) => [id, fieldLabelOf(id)]),
);

/**
 * A value of the contract, clicked on its page (Sacha 25/11/2026: the list
 * of what PO found removed, corrected where it is): which information it
 * is, the text it replaced put back (« Remettre « Léna Vasseur » »), or the
 * value taken out.
 */
export function DocumentFieldPopover({
  chip,
  onField,
  onRestore,
  onRemove,
  onClose,
}: {
  // The value clicked; null: closed.
  chip: HTMLElement | null;
  onField: (id: ContractFieldId) => void;
  onRestore: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = fr.legalContracts.templates.editor.field;
  const field = chip?.dataset.field ?? "";
  const original = chip?.dataset.original;
  return (
    <Popover open={chip !== null} onOpenChange={(open) => !open && onClose()}>
      <PopoverContent
        anchor={chip}
        side="bottom"
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] gap-3 p-3"
      >
        <PopoverTitle>{t.title}</PopoverTitle>
        <Select
          items={FIELD_ITEMS}
          value={field}
          onValueChange={(next) =>
            typeof next === "string" && onField(next as ContractFieldId)
          }
        >
          <SelectTrigger size="sm" aria-label={t.title}>
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
        <div className="flex flex-wrap items-center gap-2">
          {original !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-w-full"
              onClick={onRestore}
            >
              <span className="truncate">{t.restore(original)}</span>
            </Button>
          )}
          <Button
            type="button"
            variant={original !== undefined ? "ghost" : "outline"}
            size="sm"
            onClick={onRemove}
          >
            {t.remove}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
