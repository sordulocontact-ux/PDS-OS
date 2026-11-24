import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { SectionTopbar } from "@/components/shell/section-topbar";
import {
  TopbarCrumb,
  type CrumbLink,
  type CrumbSwitcher,
} from "@/components/shell/topbar-crumb";
import { cn } from "@/lib/utils";

/**
 * A page of a section outside a project (Réseau, Artistes, Catalogue,
 * Contrats, Deals, Calls, Sessions studio, Équipe, Retours, Fichiers,
 * Dépenses, Repérage; docs/STYLE-FINANCE-PARTOUT.md § 5.1): the top band
 * saying where one is (TopbarCrumb, Sacha 24/11/2026: the section's name,
 * or « Deals / Sortie Nova ⌄ » for a page opened from its list, `parent`,
 * the name switching to another record of the list, `switcher`), then the
 * page, 24 px between its blocks; a section's own page (`list`) shows no
 * title under the band, its action alone on the right. A page under the
 * section (a contact, a title) keeps its name as the page's title.
 */
export function SectionFrame({
  title,
  description,
  action,
  leading,
  badge,
  above,
  parent,
  switcher,
  list = true,
  toolsAction = false,
  header = true,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  leading?: React.ReactNode;
  badge?: React.ReactNode;
  // Something over the title (a page under the section).
  above?: React.ReactNode;
  // The list it was opened from, a link in the band (in place of a back
  // link); a page further down gives the whole way.
  parent?: CrumbLink | CrumbLink[];
  // The record's name in the band opens the others of that list.
  switcher?: CrumbSwitcher;
  // False for a page under the section, which keeps its title visible.
  list?: boolean;
  // The page also gives `action` to its DataTableViews (`pageAction`): in
  // the new style it sits at the end of the views' line, not on a line of
  // its own above them.
  toolsAction?: boolean;
  // False when the page draws its own head.
  header?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SectionTopbar>
        <TopbarCrumb
          parents={parent === undefined ? [] : [parent].flat()}
          title={title}
          switcher={switcher}
        />
      </SectionTopbar>
      <PageContainer className={cn("modern:gap-6", className)}>
        {above}
        {header && (
          <PageHeader
            title={title}
            description={description}
            action={action}
            toolsAction={toolsAction}
            leading={leading}
            badge={badge}
            list={list}
          />
        )}
        {children}
      </PageContainer>
    </>
  );
}
