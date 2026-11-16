import { AppSearch } from "@/components/shell/app-search";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { SectionTopbar } from "@/components/shell/section-topbar";
import { cn } from "@/lib/utils";

/**
 * A page of a section outside a project (Réseau, Artistes, Catalogue,
 * Contrats, Deals, Calls, Sessions studio, Équipe, Retours, Fichiers,
 * Dépenses, Repérage; docs/STYLE-FINANCE-PARTOUT.md § 5.1). In the new
 * style: the top band with the app's ⌘K search, then the page, 24 px
 * between its blocks; a section's own page (`list`) shows no title, its
 * action alone on the right. A page under the section (a contact, a title)
 * keeps its name, its back link above it (`above`). The classic style shows
 * the page as it was: no band, the title and its description.
 */
export function SectionFrame({
  title,
  description,
  action,
  leading,
  badge,
  above,
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
  // A back link over the title (a page under the section).
  above?: React.ReactNode;
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
        <AppSearch />
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
