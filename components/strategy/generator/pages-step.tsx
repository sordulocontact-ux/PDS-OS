"use client";

import { useState } from "react";

import { PageEditDialog } from "@/components/strategy/generator/page-edit-dialog";
import { useDraftSave } from "@/components/strategy/generator/use-draft-save";
import { Button } from "@/components/ui/button";
import { MoveButtons } from "@/components/ui/move-buttons";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { PageKey } from "@/lib/strategy/documents/model";
import { move } from "@/lib/utils/move";
import { cn } from "@/lib/utils";

export type PageChoice = {
  key: PageKey;
  hidden: boolean;
  title?: string;
  text?: string;
};

/**
 * The recap before generation (ticket § 11, step 6): exactly the pages that
 * will be generated, each with Modifier, Masquer and its place. A page with
 * nothing to show (no text, no data) is left out of the document.
 */
export function PagesStep({
  projectId,
  kind,
  initial,
  empty,
  nextHref,
}: {
  projectId: string;
  kind: "release_plan" | "press_kit";
  initial: PageChoice[];
  // Pages the data leaves empty today (they appear once filled).
  empty: PageKey[];
  nextHref: string;
}) {
  const t = fr.strategyDocs;
  const g = t.generator;
  const { pending, save } = useDraftSave(projectId, kind);
  const [pages, setPages] = useState(initial);
  const [editing, setEditing] = useState<PageChoice | null>(null);
  const label = (p: PageChoice) => p.title?.trim() || t.pages[p.key];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{t.plan.pagesTitle}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.plan.pagesBody}
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {pages.map((page, index) => {
          const isEmpty = empty.includes(page.key) && !page.text?.trim();
          return (
            <li
              key={page.key}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3",
                page.hidden && "bg-[var(--surface-tint)]",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-6 text-caption text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "truncate text-body-md font-semibold",
                    page.hidden && "text-muted-foreground",
                  )}
                >
                  {label(page)}
                </span>
                {page.hidden ? (
                  <StatusBadge tone="neutral" size="sm">
                    {t.plan.hidden}
                  </StatusBadge>
                ) : (
                  isEmpty && (
                    <StatusBadge tone="neutral" size="sm">
                      {t.plan.emptyPage}
                    </StatusBadge>
                  )
                )}
              </span>
              <span className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={g.editLabel(label(page))}
                  onClick={() => setEditing(page)}
                >
                  {g.edit}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPages((l) =>
                      l.map((p) =>
                        p.key === page.key ? { ...p, hidden: !p.hidden } : p,
                      ),
                    )
                  }
                >
                  {page.hidden ? g.show : g.hide}
                </Button>
                <MoveButtons
                  upLabel={g.moveUpLabel(label(page))}
                  downLabel={g.moveDownLabel(label(page))}
                  first={index === 0}
                  last={index === pages.length - 1}
                  onMove={(delta) => setPages((l) => move(l, index, delta))}
                />
              </span>
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        className="self-start"
        disabled={pending}
        onClick={() => save({ pages, pagesConfirmed: true }, nextHref)}
      >
        {pending ? g.saving : g.validate}
      </Button>
      <PageEditDialog
        page={editing}
        defaultTitle={editing ? t.pages[editing.key] : ""}
        onClose={() => setEditing(null)}
        onSave={(next) => {
          setPages((l) => l.map((p) => (p.key === next.key ? next : p)));
          setEditing(null);
        }}
      />
    </section>
  );
}
