import type { ReactNode } from "react";

import { FinanceSidebar } from "@/components/finance/finance-sidebar";
import { FinanceTopbar } from "@/components/finance/search/finance-topbar";
import type { CrumbSwitcher } from "@/components/shell/topbar-crumb";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { SectionTabs } from "@/components/shell/section-tabs";
import { DialogSideProvider } from "@/components/ui/dialog";
import { treasury } from "@/lib/i18n/fr/treasury";
import {
  FINANCE_SECTIONS,
  type FinanceSection,
} from "@/lib/ui/finance-sections";
import { cn } from "@/lib/utils";

const fr = { treasury };

/**
 * Every Finance page (Ibé's ticket « Cockpit Finance », 13/11/2026): the
 * second sidebar with the sections (desktop, the main sidebar collapsed to
 * icons, as in a project: Sacha 13/11/2026), the page titled by its
 * section with its own action, then the page. On a phone, the sections as
 * a row of tabs. Its Dépenses (every spend of the label, lot 3) is not the
 * team's Dépenses page (/app/expenses), which stays apart.
 *
 * New style (Sacha 15/11/2026, docs/FINANCE-V2.md): the whole section sits
 * in `.finance-scope`, which redefines the type, weight and radius tokens
 * (app/globals.css), so every component inside takes Finance's lighter,
 * smaller look without a change of its own. `header={false}`: the page draws
 * its own head (the overview's greeting). Lot 2: a section's page shows no
 * title (the sidebar already says where one is, as in the proto) and opens
 * on its tools; its h1 stays for screen readers, its action on the right.
 * An envelope's page (`title`) keeps its name as a visible title. Lot 5:
 * every page opens on the top band of the proto (where one is since
 * 24/11/2026, « Budgets / Ciel ouvert ⌄ », the search heading the Finance
 * sidebar; the alerts bell), the page's action under it on the right. Every
 * modal of the section opens as the panel on the right (DialogSideProvider).
 */
export function FinanceFrame({
  section,
  title,
  switcher,
  action,
  header = true,
  children,
}: {
  section: FinanceSection;
  // A page under a section (an envelope) names itself; else the section.
  title?: string;
  // An envelope's name in the top band opens the other budgets.
  switcher?: CrumbSwitcher;
  action?: ReactNode;
  header?: boolean;
  children: ReactNode;
}) {
  const current = FINANCE_SECTIONS.find((s) => s.key === section);
  return (
    <DialogSideProvider side="right" className="finance-scope">
      <div className="finance-scope flex flex-1">
        <FinanceSidebar />
        <div className="min-w-0 flex-1">
          <FinanceTopbar record={title ? { title, switcher } : undefined} />
          <PageContainer className="gap-6">
            <div
              className={cn(
                "flex flex-col gap-4",
                // Nothing but the phone's tabs: no room taken on a desktop.
                !(header && (title || action)) && "md:hidden",
              )}
            >
              {header &&
                (title ? (
                  <PageHeader title={title} action={action} />
                ) : (
                  <>
                    <h1 className="sr-only">{current?.label}</h1>
                    {action && (
                      <div className="flex items-center justify-end gap-3">
                        {action}
                      </div>
                    )}
                  </>
                ))}
              <div className="md:hidden">
                <SectionTabs
                  label={fr.treasury.tabs.label}
                  tabs={FINANCE_SECTIONS.map((s) => ({
                    href: s.href,
                    label: s.label,
                    ...("exact" in s ? { exact: s.exact } : {}),
                  }))}
                />
              </div>
            </div>
            {children}
          </PageContainer>
        </div>
      </div>
    </DialogSideProvider>
  );
}
