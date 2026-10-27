"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BudgetLineForm } from "@/components/budget/budget-line-form";
import { Button } from "@/components/ui/button";
import { Loaded } from "@/components/ui/loaded";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { loadExpenseForm } from "@/lib/budget/actions";
import { fr } from "@/lib/i18n/fr";

// The Marketing pages where a spend shows up while working (the Budget
// page has its own button).
const MARKETING = /\/(strategy|design|production|activations|review)(\/|$)/;

/**
 * « Ajouter une dépense » from any Marketing page of the project
 * (MKT-S1-15), for whoever writes its budget: the same line as on the
 * Budget page (same form, same table), never a second record.
 */
export function AddExpenseButton({ projectId }: { projectId: string }) {
  const t = fr.budget;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (!MARKETING.test(pathname.replace(`/app/projects/${projectId}`, "")))
    return null;
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.add}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <SheetHeader className="px-5 pt-5 pr-14">
            <SheetTitle>{t.form.newTitle}</SheetTitle>
            <SheetDescription>{t.form.globalDescription}</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <Loaded
                load={() => loadExpenseForm(projectId)}
                loadingLabel={t.form.loading}
                errorLabel={t.loadError}
              >
                {(data) => (
                  <BudgetLineForm
                    projectId={projectId}
                    line={null}
                    levers={data.levers}
                    deliverables={data.deliverables}
                    organizationId={data.organizationId}
                    onDone={() => {
                      setOpen(false);
                    }}
                  />
                )}
              </Loaded>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
