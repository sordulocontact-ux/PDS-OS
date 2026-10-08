"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Hue } from "@/lib/ui/category-hues";
import type { Tone } from "@/lib/ui/state-tones";

export type PlanRowView = {
  label: string;
  tag: { label: string; hue: Hue } | null;
  meta: string[];
  badge: { label: string; tone: Tone };
  verb: string;
  // The line's next action in ink when a decision waits, outlined when
  // the team acts, quiet when it waits or is done.
  emphasis: "decision" | "act" | "quiet";
};

/**
 * One line of the Plan d'action (the prototype's): what it is about, its
 * state in a badge, the verb of what to do; the whole line opens the panel
 * where it is done, beside the plan. The panel's body comes from the
 * server (the fiche, the contract, the split, the bulletin…).
 */
export function PlanRowSheet({
  view,
  section,
  sub,
  defaultOpen = false,
  children,
}: {
  view: PlanRowView;
  // The démarche, said at the top of the panel.
  section: string;
  sub: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="-mx-2 grid cursor-pointer items-center gap-2 rounded-lg border-t px-2 py-3 transition-colors duration-[var(--duration-fast)] outline-none first:border-t-0 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:gap-4"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5 font-medium break-words">
            {view.label}
            {view.tag && (
              <StatusBadge tone={view.tag.hue} size="sm">
                {view.tag.label}
              </StatusBadge>
            )}
          </span>
          {view.meta.length > 0 && (
            <span className="text-sm break-words text-muted-foreground">
              {view.meta.join(" · ")}
            </span>
          )}
        </span>
        <span className="flex">
          <StatusBadge tone={view.badge.tone} size="sm">
            {view.badge.label}
          </StatusBadge>
        </span>
        <span className="flex sm:justify-end">
          <Button
            size="xs"
            tabIndex={-1}
            variant={
              view.emphasis === "decision"
                ? "default"
                : view.emphasis === "act"
                  ? "outline"
                  : "ghost"
            }
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
          >
            {view.verb}
          </Button>
        </span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader className="gap-2 px-5 pt-5 pr-14">
            <span className="flex flex-wrap items-center gap-1.5">
              <StatusBadge tone="neutral" size="sm">
                {section}
              </StatusBadge>
              {view.tag && (
                <StatusBadge tone={view.tag.hue} size="sm">
                  {view.tag.label}
                </StatusBadge>
              )}
              <StatusBadge tone={view.badge.tone} size="sm">
                {view.badge.label}
              </StatusBadge>
            </span>
            <SheetTitle>{view.label}</SheetTitle>
            <SheetDescription>{sub}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
