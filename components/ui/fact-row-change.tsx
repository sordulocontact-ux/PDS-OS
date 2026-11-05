"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  FactRowFrame,
  type FactChange,
  type FactRowProps,
} from "@/components/ui/fact-row-frame";
import { FormDialog } from "@/components/ui/form-dialog";
import { PickListDoneContext } from "@/components/ui/pick-list-context";
import { decisions } from "@/lib/i18n/fr/decisions";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { decisions, dialogs };

const t = fr.decisions.fact;

/**
 * A fact chosen from a list (docs/VISION-UX.md rule 3): « Changer » opens
 * the module's `PickList` under the row, or in a modal when `dialogTitle`
 * is set. Missing, the list is open from the start (« À choisir » in red
 * above it), or folded behind « Choisir » with `missingAs="badge"`. A
 * choice made closes it.
 */
export function FactRowChangeable({
  change,
  ...row
}: FactRowProps & { change: FactChange }) {
  // `missingAs="badge"`: folded behind « Choisir » even when missing.
  const pill = row.missingAs === "badge";
  const [open, setOpen] = useState(
    change.defaultOpen ?? (Boolean(row.missing) && !pill),
  );
  const close = () => setOpen(false);
  const hasValue = !row.missing || pill;
  const changeButton = (
    <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
      {row.missing && pill ? t.choose : t.change}
    </Button>
  );

  // A click on the whole row opens the list under it; once open, the row
  // is a plain frame again (no button around the list).
  if (row.openOnRow && !change.dialogTitle)
    return (
      <FactRowFrame
        {...row}
        {...(open
          ? {
              below: (
                <>
                  <PickListDoneContext.Provider value={close}>
                    {change.list}
                  </PickListDoneContext.Provider>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={close}
                  >
                    {t.cancel}
                  </Button>
                </>
              ),
            }
          : {
              onClick: () => setOpen(true),
              hoverAction: row.missing ? t.choose : t.change,
            })}
      />
    );

  if (change.dialogTitle)
    return (
      <>
        <FactRowFrame
          {...row}
          side={
            <>
              {row.side}
              {changeButton}
            </>
          }
        />
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title={change.dialogTitle}
          description={change.dialogDescription ?? ""}
          closeLabel={fr.dialogs.close}
        >
          <PickListDoneContext.Provider value={close}>
            {change.list}
          </PickListDoneContext.Provider>
        </FormDialog>
      </>
    );

  return (
    <FactRowFrame
      {...row}
      side={
        <>
          {row.side}
          {!open && changeButton}
        </>
      }
      below={
        open ? (
          <>
            <PickListDoneContext.Provider value={close}>
              {change.list}
            </PickListDoneContext.Provider>
            {hasValue && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={close}
              >
                {t.cancel}
              </Button>
            )}
          </>
        ) : (
          row.below
        )
      }
    />
  );
}
