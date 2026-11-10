"use client";

import { IconChevronDown } from "nucleo-sharp-essential";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  documentCardClass,
  documentHeadClass,
} from "@/components/ui/document-card-classes";
import { shell } from "@/lib/i18n/fr/shell";
import { cn } from "@/lib/utils";

const fr = { shell };

// DocumentCard `collapsible`: a chevron at the end of the head folds the
// body. The body stays mounted while folded (hidden), so a form keeps what
// was typed. The whole head toggles too; the chevron is the control read by
// the keyboard and screen readers (as PageSection `collapsible`).
export function DocumentCardFold({
  name,
  head,
  action,
  className,
  defaultOpen = true,
  children,
}: {
  name: string;
  head: ReactNode;
  action?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const t = fr.shell.section;
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className={cn(documentCardClass, className)}>
      <div
        className={cn(documentHeadClass(open), "cursor-pointer")}
        onClick={(e) => {
          // A button or link of the head keeps its own click.
          if ((e.target as HTMLElement).closest("button, a")) return;
          setOpen((o) => !o);
        }}
      >
        {head}
        <span className="flex flex-wrap items-center gap-2">
          {action}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? t.collapse(name) : t.expand(name)}
            onClick={() => setOpen((o) => !o)}
          >
            <IconChevronDown
              aria-hidden
              className={cn(
                "size-4 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </Button>
        </span>
      </div>
      <div id={bodyId} hidden={!open} className="flex min-w-0 flex-col">
        {children}
      </div>
    </section>
  );
}
