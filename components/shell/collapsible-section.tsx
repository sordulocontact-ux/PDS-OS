"use client";

import { IconChevronDown } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { shell } from "@/lib/i18n/fr/shell";
import { cn } from "@/lib/utils";

import { sectionClass, sectionHeaderClass } from "./page-section-classes";

const fr = { shell };

// PageSection `collapsible`: a chevron on the right folds the content. The
// content stays mounted while folded (hidden), so a form keeps what was
// typed. The whole header toggles too; the chevron is the control read by
// the keyboard and screen readers.
export function CollapsibleSection({
  id,
  title,
  heading,
  action,
  card,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
  heading: React.ReactNode;
  action?: React.ReactNode;
  card: boolean;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const t = fr.shell.section;
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `${id}-body`;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={sectionClass(card)}
    >
      <div
        className={cn(sectionHeaderClass, "cursor-pointer")}
        onClick={(e) => {
          // A button or link of the header keeps its own click.
          if ((e.target as HTMLElement).closest("button, a")) return;
          setOpen((o) => !o);
        }}
      >
        {heading}
        <div className="flex items-center gap-2">
          {action}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? t.collapse(title) : t.expand(title)}
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
        </div>
      </div>
      <div id={bodyId} hidden={!open} className="flex min-w-0 flex-col gap-5">
        {children}
      </div>
    </section>
  );
}
