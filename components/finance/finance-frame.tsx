import type { ReactNode } from "react";

import { FinanceSidebar } from "@/components/finance/finance-sidebar";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { SectionTabs } from "@/components/shell/section-tabs";
import { treasury } from "@/lib/i18n/fr/treasury";
import {
  FINANCE_SECTIONS,
  type FinanceSection,
} from "@/lib/ui/finance-sections";

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
 * An envelope's page (`title`) keeps its name as a visible title.
 */
export function FinanceFrame({
  section,
  title,
  action,
  header = true,
  children,
}: {
  section: FinanceSection;
  // A page under a section (an envelope) names itself; else the section.
  title?: string;
  action?: ReactNode;
  header?: boolean;
  children: ReactNode;
}) {
  const current = FINANCE_SECTIONS.find((s) => s.key === section);
  return (
    <div className="finance-scope flex flex-1">
      <FinanceSidebar />
      <div className="min-w-0 flex-1">
        <PageContainer className="gap-6">
          <div className="flex flex-col gap-4">
            {header &&
              (title ? (
                <PageHeader title={title} action={action} />
              ) : (
                <div className="flex items-center justify-end gap-3 empty:hidden">
                  <h1 className="sr-only">{current?.label}</h1>
                  {action}
                </div>
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
  );
}
