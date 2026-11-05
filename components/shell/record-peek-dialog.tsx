"use client";

import { Loaded } from "@/components/ui/loaded";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormMessage } from "@/components/auth/form-message";
import { ViewLink } from "@/components/ui/view-link";
import { peek } from "@/lib/i18n/fr/peek";
import { peekRecord } from "@/lib/peek/actions";
import type { PeekTarget } from "@/lib/peek/types";

const fr = { peek };

/**
 * A record seen from a row without leaving the page (Sacha, 05/11/2026:
 * « une modale avec les informations, avec un bouton voir plus »): an
 * artist, a person of the Réseau or a contract, read when the modal opens,
 * a few facts, then « Voir la fiche » / « Ouvrir le contrat » for its page.
 */
export function RecordPeekDialog({
  target,
  name,
  open,
  onOpenChange,
}: {
  target: PeekTarget;
  // The row's own words, so the title is there before the read.
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.peek;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description={t.kinds[target.kind]}
      closeLabel={t.close}
    >
      {/* Read when the modal opens only, again at each opening. */}
      {open && (
        <Loaded
          load={() => peekRecord(target.kind, target.id)}
          loadingLabel={t.loading}
          errorLabel={t.failed}
        >
          {(record) =>
            record === null ? (
              <FormMessage kind="error">{t.gone}</FormMessage>
            ) : (
              <div className="flex flex-col gap-4">
                {record.kind !== "contract" && (
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={record.title}
                      pictureUrl={record.pictureUrl}
                      className="size-12"
                    />
                    <span className="font-semibold break-words">
                      {record.title}
                    </span>
                  </div>
                )}
                {record.facts.length > 0 && (
                  <FactRows>
                    {record.facts.map((fact) => (
                      <FactRow
                        key={fact.label}
                        label={fact.label}
                        value={fact.value}
                      />
                    ))}
                  </FactRows>
                )}
                <ViewLink
                  href={record.href}
                  className={buttonVariants({
                    variant: "outline",
                    className: "self-start",
                  })}
                >
                  {t.open[record.kind]}
                </ViewLink>
              </div>
            )
          }
        </Loaded>
      )}
    </FormDialog>
  );
}
