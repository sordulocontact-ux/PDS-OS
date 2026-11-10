"use client";

import { useState } from "react";

import { PageEditForm } from "@/components/strategy/release-plan/page-edit-form";
import { useDraftSave } from "@/components/strategy/release-plan/use-draft-save";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { MoveButtons } from "@/components/ui/move-buttons";
import { StatusBadge } from "@/components/ui/status-badge";
import { StepSection } from "@/components/shell/journey/step-section";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { GeneratorKind } from "@/lib/strategy/documents/generator-kind";
import type { AnyPageChoice } from "@/lib/strategy/documents/release-plan-model";
import { draftTone } from "@/lib/ui/state-tones";
import { move } from "@/lib/utils/move";
import { cn } from "@/lib/utils";

const fr = { strategyReleasePlan };

/**
 * Step 6 (ticket § 11): exactly the pages that will be generated, in order.
 * Per page: Modifier (own title, own text), Masquer, Réordonner. A page the
 * data leaves empty is said so (it is not generated unless given a text).
 */
export function PagesStep({
  projectId,
  initial,
  empty,
  names,
  nextHref,
  canEdit,
  kind = "release_plan",
}: {
  projectId: string;
  initial: AnyPageChoice[];
  empty: string[];
  // Each page's proposed name, by key.
  names: Record<string, string>;
  nextHref: string;
  canEdit: boolean;
  kind?: GeneratorKind;
}) {
  const t = fr.strategyReleasePlan.pages;
  const a = fr.strategyReleasePlan.actions;
  const { pending, save } = useDraftSave(projectId, kind);
  const [pages, setPages] = useState(initial);
  const [editing, setEditing] = useState<AnyPageChoice | null>(null);
  const update = (key: string, patch: Partial<AnyPageChoice>) =>
    setPages((list) =>
      list.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    );
  const isEmpty = (p: AnyPageChoice) => empty.includes(p.key) && !p.text;

  return (
    <StepSection title={t.title} description={t.body}>
      <div className="flex flex-col gap-6">
        <ol className="flex flex-col gap-2">
          {pages.map((page, index) => {
            const name = page.title || names[page.key] || page.key;
            const off = page.hidden || isEmpty(page);
            return (
              <li
                key={page.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "font-semibold break-words",
                      off && "text-muted-foreground line-through",
                    )}
                  >
                    {name}
                  </span>
                  {page.hidden ? (
                    <StatusBadge tone={draftTone} size="sm">
                      {t.hidden}
                    </StatusBadge>
                  ) : (
                    isEmpty(page) && (
                      <StatusBadge tone={draftTone} size="sm">
                        {t.empty}
                      </StatusBadge>
                    )
                  )}
                </span>
                {canEdit && (
                  <span className="flex items-center gap-1">
                    <MoveButtons
                      upLabel={a.moveUpLabel(name)}
                      downLabel={a.moveDownLabel(name)}
                      first={index === 0}
                      last={index === pages.length - 1}
                      onMove={(delta) => setPages((l) => move(l, index, delta))}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={a.editLabel(name)}
                      onClick={() => setEditing(page)}
                    >
                      {a.edit}
                    </Button>
                    {page.key !== "cover" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          update(page.key, { hidden: !page.hidden })
                        }
                      >
                        {page.hidden ? a.show : a.hide}
                      </Button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        {canEdit && (
          <Button
            type="button"
            className="self-start"
            disabled={pending}
            onClick={() =>
              // The keys come from the document's own list; the server
              // checks them against it.
              save(
                { pages, pagesConfirmed: true } as Parameters<typeof save>[0],
                nextHref,
              )
            }
          >
            {pending ? a.saving : a.validate}
          </Button>
        )}
        {editing && (
          <FormDialog
            open
            onOpenChange={(open) => !open && setEditing(null)}
            title={t.editTitle(names[editing.key] ?? editing.key)}
            description={t.editBody}
            closeLabel={a.cancel}
          >
            <PageEditForm
              page={editing}
              name={names[editing.key] ?? editing.key}
              onCancel={() => setEditing(null)}
              onSave={(patch) => {
                update(editing.key, patch);
                setEditing(null);
              }}
            />
          </FormDialog>
        )}
      </div>
    </StepSection>
  );
}
