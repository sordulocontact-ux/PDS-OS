"use client";

import { useState } from "react";

import { DeclarationForm } from "@/components/catalog/master-page/declaration-form";
import { AddItemButton } from "@/components/catalog/master-page/item-dialogs";
import { OptionSelect } from "@/components/projects/option-select";
import { EmptyNote } from "@/components/shell/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ORGANISMS, type Organism } from "@/lib/catalog/master/rules";
import { legal } from "@/lib/i18n/fr/legal";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { legal, masterPage };

/** « Déclarer » under the Déclarations section: any title, any organism
 * not declared yet. */
export function DeclareButton({
  titles,
  declared,
}: {
  titles: Array<{ id: string; title: string }>;
  // Organisms already declared, per title id.
  declared: Record<string, Organism[]>;
}) {
  const [open, setOpen] = useState(false);
  if (titles.length === 0) return null;
  return (
    <>
      <AddItemButton
        label={fr.legal.inventory.actions.declare}
        onClick={() => setOpen(true)}
      />
      <DeclareDialog
        titles={titles}
        declared={declared}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

/**
 * A filing declared from the État des lieux: choose the title (when there
 * are several) and an organism not declared yet, then the title page's own
 * declaration form. Opened by the section's button, or by a click on a
 * title's « Aucune déclaration » row (that title only).
 */
export function DeclareDialog({
  titles,
  declared,
  open,
  onOpenChange,
}: {
  titles: Array<{ id: string; title: string }>;
  declared: Record<string, Organism[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.masterPage.declarations;
  const l = fr.legal.inventory.actions;
  const [masterId, setMasterId] = useState(titles[0]?.id ?? "");
  const free = ORGANISMS.filter((o) => !declared[masterId]?.includes(o));
  const [organism, setOrganism] = useState<Organism | null>(null);
  // The chosen organism, or the first one still free for this title.
  const current = organism && free.includes(organism) ? organism : free[0];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={l.declareTitle}
      description={l.declareDescription}
      closeLabel={fr.masterPage.form.close}
    >
      <div className="flex flex-col gap-5">
        {titles.length > 1 && (
          <OptionSelect
            name="legal-declare-title"
            label={l.title}
            required
            items={Object.fromEntries(titles.map((m) => [m.id, m.title]))}
            defaultValue={masterId}
            onValueChange={setMasterId}
          />
        )}
        {current ? (
          <>
            <OptionSelect
              // Remounted per title: its free organisms differ.
              key={masterId}
              name="legal-declare-organism"
              label={l.organism}
              required
              items={Object.fromEntries(free.map((o) => [o, t.organisms[o]]))}
              defaultValue={current}
              onValueChange={(value) => setOrganism(value as Organism)}
            />
            <DeclarationForm
              key={`${masterId}-${current}`}
              masterId={masterId}
              organism={current}
              declaration={null}
              onDone={() => onOpenChange(false)}
            />
          </>
        ) : (
          <EmptyNote>{l.allDeclared}</EmptyNote>
        )}
      </div>
    </FormDialog>
  );
}
