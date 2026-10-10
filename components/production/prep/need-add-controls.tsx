"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import type { NeedFamily, NeedSuggestion } from "@/lib/production/roles";

import { NeedForm, type NeedDraft } from "./need-form";
import { roleLabel } from "./need-label";

const t = fr.productionNeeds;

/**
 * The family's heading with « Ajouter un poste », then PO's suggestions as
 * pills: a click opens the same form pre-filled, nothing is saved until the
 * person confirms it.
 */
export function NeedAddControls({
  projectId,
  sheetId,
  family,
  heading,
  suggestions,
}: {
  projectId: string;
  sheetId: string;
  family: NeedFamily;
  heading: React.ReactNode;
  suggestions: NeedSuggestion[];
}) {
  const [draft, setDraft] = useState<NeedDraft | null>(null);
  const familyLabel = t.families[family];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {heading}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setDraft({ need: null, roleKey: null, suggestedBecause: null })
          }
        >
          <IconPlus aria-hidden data-icon="inline-start" />
          {t.add.open}
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t.suggestions.title}
          </span>
          {suggestions.map((s) => {
            const role = roleLabel(s.roleKey);
            const reason = t.suggestions.reasons[s.because];
            return (
              <Button
                key={s.roleKey}
                variant="outline"
                size="sm"
                className="rounded-pill"
                aria-label={t.suggestions.open(role, reason)}
                onClick={() =>
                  setDraft({
                    need: null,
                    roleKey: s.roleKey,
                    suggestedBecause: reason,
                  })
                }
              >
                <IconPlus aria-hidden data-icon="inline-start" />
                {role}
                <span className="text-muted-foreground">· {reason}</span>
              </Button>
            );
          })}
        </div>
      )}
      <FormDialog
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        title={t.add.title(familyLabel)}
        description={t.add.description}
        closeLabel={t.close}
      >
        {draft && (
          <NeedForm
            projectId={projectId}
            sheetId={sheetId}
            family={family}
            draft={draft}
            onDone={() => setDraft(null)}
          />
        )}
      </FormDialog>
    </div>
  );
}
