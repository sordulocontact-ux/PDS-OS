import { SectionFrame } from "@/components/shell/section-frame";
import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { settings } from "@/lib/i18n/fr/settings";
import {
  SETTINGS_SECTIONS,
  type SettingsPage,
} from "@/lib/ui/settings-sections";

/**
 * A page of Paramètres: its name in the top band under « Paramètres », its
 * title, then its groups of rows (SettingsRow). The column of pages is the
 * section's layout's; on a phone, the pages are tabs above the title.
 */
export function SettingsFrame({
  page,
  pages,
  description,
  children,
}: {
  page: SettingsPage;
  // The pages the reader may open (the phone's tabs).
  pages: SettingsPage[];
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <SectionFrame
      title={settings.pages[page]}
      description={description}
      parent={{ label: settings.title, href: routes.settings }}
      list={false}
      className="max-w-3xl"
      above={
        <div className="md:hidden">
          <SectionTabs
            label={settings.navLabel}
            tabs={pages.map((p) => ({
              href: SETTINGS_SECTIONS[p].href,
              label: settings.pages[p],
            }))}
          />
        </div>
      }
    >
      {children}
    </SectionFrame>
  );
}
