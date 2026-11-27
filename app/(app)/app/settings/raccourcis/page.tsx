import { sectionCardClass } from "@/components/ui/section-card";
import { SectionFrame } from "@/components/shell/section-frame";
import { ShortcutsEditor } from "@/components/settings/shortcuts-editor";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { core } from "@/lib/i18n/fr/core";
import { shortcuts } from "@/lib/i18n/fr/shortcuts";

export const metadata = { title: `${shortcuts.title} · ${core.app.name}` };

// Paramètres › Raccourcis clavier (27/11/2026): each member's own keys for the
// search, the « + », PO and a feedback's capture (lib/shortcuts/).
export default async function ShortcutsPage() {
  await requireApproved();
  return (
    <SectionFrame
      title={shortcuts.title}
      parent={{ label: shortcuts.back, href: routes.settings }}
      list={false}
      className="max-w-2xl"
    >
      {/* The card alone: the page's title already names it. */}
      <div className={sectionCardClass}>
        <ShortcutsEditor />
      </div>
    </SectionFrame>
  );
}
