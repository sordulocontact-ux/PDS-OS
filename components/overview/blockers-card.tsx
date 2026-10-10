"use client";

import { IconTriangleWarning } from "nucleo-sharp-essential";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { BoardBlocker } from "@/lib/workflow-status/board";

/**
 * What blocks, each line opening a panel with its cause, its impact, its
 * source and the way to act on it (ticket « Architecture globale » § 11:
 * « Cliquer sur un blocage : afficher sa cause, son impact, sa source et les
 * actions permises »). A workflow the viewer may not read is never read,
 * so its blockers are not listed (its card says the access is restricted).
 */
export function BlockersCard({ blockers }: { blockers: BoardBlocker[] }) {
  const t = fr.workflowStatus.board.blockers;
  const [open, setOpen] = useState<BoardBlocker | null>(null);
  const name = (workflow: string) =>
    fr.shell.project.sidebar[
      workflow as "master" | "legal" | "marketing" | "distribution"
    ];

  return (
    <>
      <ListCard
        title={t.title}
        count={blockers.length}
        empty={blockers.length === 0 ? t.empty : undefined}
      >
        {blockers.map((blocker) => (
          <li key={blocker.key}>
            <button
              type="button"
              onClick={() => setOpen(blocker)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-lg px-2 py-1 text-left hover:bg-[var(--control-bg-hover)]"
            >
              <IconTriangleWarning
                aria-hidden
                className="mt-1 size-4 shrink-0 text-[color:var(--tone-danger-fg)]"
              />
              <span className="grid min-w-0 gap-1 text-body-md text-foreground">
                <span className="font-semibold break-words">
                  {blocker.title}
                </span>
                <span className="break-words">
                  {name(blocker.workflow)} · {blocker.cause}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ListCard>

      <Sheet
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
      >
        <SheetContent side="right" className="w-full gap-6 sm:max-w-md">
          {open && (
            <>
              <SheetHeader className="p-0">
                <SheetTitle>{open.title}</SheetTitle>
                <SheetDescription>
                  {t.source} : {name(open.workflow)}
                </SheetDescription>
              </SheetHeader>
              <dl className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <dt className="text-caption text-muted-foreground">
                    {t.cause}
                  </dt>
                  <dd className="text-body-md">{open.cause}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-caption text-muted-foreground">
                    {t.impact}
                  </dt>
                  <dd className="text-body-md">{open.impact}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2">
                <p className="text-caption text-muted-foreground">
                  {t.actions}
                </p>
                <ViewLink
                  href={open.href}
                  onClick={() => setOpen(null)}
                  className={buttonVariants({ className: "w-fit" })}
                >
                  {t.openSource(name(open.workflow))}
                </ViewLink>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
