"use client";

import { useState } from "react";

import { MasterEditForm } from "@/components/catalog/master-edit-form";
import { Button, buttonVariants, ButtonRoll } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ViewLink } from "@/components/ui/view-link";
import type { MasterRights, SplitKind } from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { records } from "@/lib/i18n/fr/records";

import { ContributorForm } from "./contributor-form";
import { RightsForm } from "./rights-form";
import { SplitForm } from "./split-form";

const fr = { masterPage, records };

/** What a row of the dossier opens: the very dialog of the tab where the
 * piece is kept, or that tab when the work is done there. */
export type DossierActionTarget =
  | { kind: "title" }
  | { kind: "rights"; rights: MasterRights }
  | { kind: "contributor" }
  | { kind: "split"; splitKind: SplitKind; available: number }
  | { kind: "link"; href: string };

/**
 * A piece of the dossier filled where it is read (proto
 * `docs/protos/titre.html`): the title's edit (ISRC), the rights, a new
 * contributor, a new share; the declarations and the audio open their tab.
 * Used by the dossier's rows and by « Maintenant ».
 */
export function DossierAction({
  masterId,
  target,
  label,
  variant = "outline",
  size = "sm",
}: {
  masterId: string;
  target: DossierActionTarget;
  label: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  if (target.kind === "link")
    return (
      <ViewLink
        href={target.href}
        className={buttonVariants({ variant, size })}
      >
        <ButtonRoll>{label}</ButtonRoll>
      </ViewLink>
    );

  const t = fr.masterPage;
  const close = () => setOpen(false);
  const dialog =
    target.kind === "title"
      ? {
          title: fr.records.edit.title.master,
          description: fr.records.edit.description.master,
          body: (
            <MasterEditForm
              masterId={masterId}
              onSaved={close}
              onCancel={close}
            />
          ),
        }
      : target.kind === "rights"
        ? {
            title: t.rights.editTitle,
            description: t.rights.formDescription,
            body: (
              <RightsForm
                masterId={masterId}
                rights={target.rights}
                onDone={close}
                onCancel={close}
              />
            ),
          }
        : target.kind === "contributor"
          ? {
              title: t.credits.addTitle,
              description: t.credits.formDescription,
              body: (
                <ContributorForm
                  masterId={masterId}
                  contributor={null}
                  onDone={close}
                  onCancel={close}
                />
              ),
            }
          : {
              title: t.splits.addTitle,
              description: t.splits.formDescription,
              body: (
                <SplitForm
                  masterId={masterId}
                  split={null}
                  kind={target.splitKind}
                  available={target.available}
                  onDone={close}
                  onCancel={close}
                />
              ),
            };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={dialog.title}
        description={dialog.description}
        closeLabel={t.form.close}
      >
        {open && dialog.body}
      </FormDialog>
    </>
  );
}
