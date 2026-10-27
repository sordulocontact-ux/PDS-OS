"use client";

import { BudgetLineForm } from "@/components/budget/budget-line-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  BudgetDeliverable,
  BudgetLever,
  BudgetLine,
} from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

// Side panel to add a line (line = null) or edit one. Mounted per opening,
// so the fields always start from the saved values.
export function BudgetLineSheet({
  projectId,
  line,
  levers,
  deliverables,
  organizationId,
  open,
  onOpenChange,
}: {
  projectId: string;
  line: BudgetLine | null;
  levers: BudgetLever[];
  deliverables?: BudgetDeliverable[];
  organizationId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.budget.form;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="px-5 pt-5 pr-14">
          <SheetTitle>{line ? t.editTitle : t.newTitle}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        {open && (
          <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <BudgetLineForm
              projectId={projectId}
              line={line}
              levers={levers}
              deliverables={deliverables}
              organizationId={organizationId}
              onDone={() => onOpenChange(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
