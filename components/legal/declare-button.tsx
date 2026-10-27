"use client";

import { useState } from "react";

import { DeclarationForm } from "@/components/catalog/master-page/declaration-form";
import { AddItemButton } from "@/components/catalog/master-page/item-dialogs";
import { OptionSelect } from "@/components/projects/option-select";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ORGANISMS, type Organism } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

/**
 * "Déclarer" a filing from the État des lieux: choose the title (when the
 * project has several) and an organism not declared yet, then the title
 * page's own declaration form. `row`: the small button of a title's row,
 * that title only; otherwise the section's button.
 */
export function DeclareButton({
  titles,
  declared,
  row = false,
}: {
  titles: Array<{ id: string; title: string }>;
  // Organisms already declared, per title id.
  declared: Record<string, Organism[]>;
  row?: boolean;
}) {
  const t = fr.masterPage.declarations;
  const l = fr.legal.inventory.actions;
  const [open, setOpen] = useState(false);
  const [masterId, setMasterId] = useState(titles[0]?.id ?? "");
  const free = ORGANISMS.filter((o) => !declared[masterId]?.includes(o));
  const [organism, setOrganism] = useState<Organism | null>(null);
  // The chosen organism, or the first one still free for this title.
  const current = organism && free.includes(organism) ? organism : free[0];
  if (titles.length === 0) return null;

  return (
    <>
      {row ? (
        <Button
          variant="outline"
          size="xs"
          className="relative z-10"
          onClick={() => setOpen(true)}
        >
          {l.declare}
        </Button>
      ) : (
        <AddItemButton label={l.declare} onClick={() => setOpen(true)} />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
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
                onDone={() => {
                  setOpen(false);
                }}
              />
            </>
          ) : (
            <EmptyNote>{l.allDeclared}</EmptyNote>
          )}
        </div>
      </FormDialog>
    </>
  );
}
