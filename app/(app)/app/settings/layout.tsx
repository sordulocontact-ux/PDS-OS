import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import { settingsPagesFor } from "@/lib/ui/settings-sections";

// Paramètres (27/11/2026): its own column of pages, the main sidebar
// collapsed to icons (use-collapsed-nav.tsx), as Finance. Display only:
// each page checks the reader's access itself.
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAccess();
  const pages = settingsPagesFor(can(access, "administer"));
  return (
    <div className="flex flex-1">
      <SettingsSidebar pages={pages} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
