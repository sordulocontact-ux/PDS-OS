import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
import { linkJourneyCards } from "@/components/production/provider/link-journey";
import { ProviderSpaceView } from "@/components/production/provider/provider-space";
import { fr } from "@/lib/i18n/fr";
import {
  getProviderLocations,
  getProviderSpace,
  noteProviderOpened,
} from "@/lib/production/provider/public";
import { getPortalFrame } from "@/lib/portal/frame";
import { getLinkJourney } from "@/lib/production/provider/journey";
import { formatDate } from "@/lib/release/format";

const t = fr.productionProvider;

// The provider's own space, opened from its link without an account
// (PROD-026). Never indexed, no referrer: the token is the key.
export const metadata: Metadata = {
  title: `${t.pageTitle} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ProviderSpacePage({
  params,
}: PageProps<"/p/[token]">) {
  const { token } = await params;
  const space = await getProviderSpace(token);
  if (!space) notFound();
  if (space.state === "open") await noteProviderOpened(token);
  const [journey, frame] = await Promise.all([
    space.state === "open" ? getLinkJourney(token) : null,
    getPortalFrame("provider", token),
  ]);
  if (space.state !== "open")
    return (
      <PortalShell frame={frame} title={fr.portal.closed}>
        <p className="text-muted-foreground">
          {space.state === "replaced" ? t.replaced : t.expiredPage}
        </p>
      </PortalShell>
    );
  const cards = journey
    ? linkJourneyCards({ token, journey, provider: space.provider })
    : [];
  return (
    <PortalShell
      frame={frame}
      role={fr.portal.roles.provider}
      title={portalTitle(cards)}
    >
      <p className="text-muted-foreground">
        {t.intro(space.provider, space.deliverable, space.project)}{" "}
        {t.until(formatDate(space.expiresAt))}
      </p>
      <PortalSections cards={cards} />
      <ProviderSpaceView
        token={token}
        space={space}
        locations={await getProviderLocations(token)}
        quiet={Boolean(journey && journey.roles.length > 0)}
        hideVersions={Boolean(journey?.cut)}
      />
    </PortalShell>
  );
}
