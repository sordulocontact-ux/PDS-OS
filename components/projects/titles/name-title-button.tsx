"use client";

import { useState } from "react";

import { TitleNameField } from "@/components/projects/titles/title-name-field";
import { Button } from "@/components/ui/button";
import { projectTitles } from "@/lib/i18n/fr/project-titles";

const fr = { projectTitles };

const t = fr.projectTitles.naming;

/**
 * « Nommer » on a row of a title still to be named (Sacha, 27/11/2026: « le
 * bouton action pour le nommer dans la liste aussi »): the field opens in
 * the row, above its link (`relative z-10`), Entrée names it, Échap closes.
 */
export function NameTitleButton({
  projectId,
  titleId,
}: {
  projectId: string;
  titleId: string;
}) {
  const [open, setOpen] = useState(false);
  if (open)
    return (
      <div className="relative z-10 pt-1.5">
        <TitleNameField
          projectId={projectId}
          titleId={titleId}
          required
          submitLabel={t.submit}
          done={t.named}
          onDone={() => setOpen(false)}
          onCancel={() => setOpen(false)}
          autoFocus
        />
      </div>
    );
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="relative z-10 shrink-0"
      onClick={() => setOpen(true)}
    >
      {t.submit}
    </Button>
  );
}
