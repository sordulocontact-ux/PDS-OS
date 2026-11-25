"use client";

import { IconChevronDown } from "nucleo-sharp-essential";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import {
  CONTRACT_FIELD_GROUPS,
  type ContractFieldId,
} from "@/lib/legal/contracts/fields";
import { cn } from "@/lib/utils";

const fr = { legalContracts };

export type DocumentMarks = { bold: boolean; underline: boolean };

/**
 * Above the contract's page, as a word processor: bold (G) and underline
 * (S), pressed where the caret is, and « Insérer une information » for a
 * template — a value filled for each contract, chosen by what it describes
 * (the person, the project, the agreement, the deal's terms). The buttons
 * keep the caret in the page.
 */
export function DocumentEditorToolbar({
  marks,
  onMark,
  onInsert,
  page,
}: {
  // Where focus goes back once a value is chosen: the page.
  page: React.RefObject<HTMLElement | null>;
  marks: DocumentMarks;
  onMark: (mark: keyof DocumentMarks) => void;
  // Absent: a contract already filled has no value to insert.
  onInsert?: (id: ContractFieldId) => void;
}) {
  const t = fr.legalContracts.templates.editor;
  const keep = (event: React.MouseEvent) => event.preventDefault();
  return (
    <div
      role="toolbar"
      aria-label={t.toolbar}
      className="flex flex-wrap items-center gap-1.5"
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t.bold}
        title={`${t.bold} (⌘B)`}
        aria-pressed={marks.bold}
        className={cn("font-bold", marks.bold && "bg-[var(--surface-pressed)]")}
        onMouseDown={keep}
        onClick={() => onMark("bold")}
      >
        {t.boldKey}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t.underline}
        title={`${t.underline} (⌘U)`}
        aria-pressed={marks.underline}
        className={cn(
          "underline underline-offset-2",
          marks.underline && "bg-[var(--surface-pressed)]",
        )}
        onMouseDown={keep}
        onClick={() => onMark("underline")}
      >
        {t.underlineKey}
      </Button>
      {onInsert && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onMouseDown={keep}
              >
                {t.insert}
                <IconChevronDown aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent
            align="start"
            finalFocus={page}
            className="max-h-[min(70vh,32rem)] overflow-y-auto"
          >
            {Object.entries(CONTRACT_FIELD_GROUPS).map(
              ([group, ids], index) => (
                <Fragment key={group}>
                  {index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuGroup>
                    <DropdownMenuGroupLabel>
                      {t.groups[group as keyof typeof t.groups]}
                    </DropdownMenuGroupLabel>
                    {ids.map((id) => (
                      <DropdownMenuItem key={id} onClick={() => onInsert(id)}>
                        {fr.legalContracts.fields[id]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </Fragment>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
