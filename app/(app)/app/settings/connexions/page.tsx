import { Suspense } from "react";

import { SettingsFrame } from "@/components/settings/settings-frame";
import { sectionCardClass } from "@/components/ui/section-card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { isConnectOutcome } from "@/lib/google/services";
import { core } from "@/lib/i18n/fr/core";
import { googleConnections } from "@/lib/i18n/fr/google-connections";
import { settings } from "@/lib/i18n/fr/settings";
import { settingsPagesFor } from "@/lib/ui/settings-sections";

import { GoogleConnectionsSection } from "../google-connections-section";

export const metadata = {
  title: `${settings.pages.connections} · ${core.app.name}`,
};

// Paramètres › Connexions: the member's own Google services
// (docs/ARCHITECTURE.md § 4 quater); `google`: how « Connecter un compte
// Google » just ended (Google's return).
export default async function ConnectionsPage({
  searchParams,
}: PageProps<"/app/settings/connexions">) {
  const access = await requireApproved();
  const google = (await searchParams).google;
  return (
    <SettingsFrame
      page="connections"
      pages={settingsPagesFor(can(access, "administer"))}
      description={googleConnections.description}
    >
      <div className={sectionCardClass}>
        <Suspense fallback={<SkeletonRows count={3} />}>
          <GoogleConnectionsSection
            access={access}
            outcome={isConnectOutcome(google) ? google : null}
          />
        </Suspense>
      </div>
    </SettingsFrame>
  );
}
