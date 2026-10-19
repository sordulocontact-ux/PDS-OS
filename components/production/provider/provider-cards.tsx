import type { PortalCardItem } from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";
import type {
  OpenProviderSpace,
  ProviderLocations,
} from "@/lib/production/provider/public";
import { formatDate } from "@/lib/release/format";

import { linkJourneyCards } from "./link-journey";
import { ProviderSpaceView } from "./provider-space";

const t = fr.productionProvider;

/**
 * The provider's cards on the person's page (/c): its part of the journey
 * (`linkJourneyCards`), then, when it has postproduction work, its space
 * (mission, corrections, versions, exports, references) as one card. Its
 * own link (/p) lays the same pieces without the card.
 */
export function providerPortalCards({
  linkKey,
  space,
  journey,
  locations,
}: {
  linkKey: string;
  space: OpenProviderSpace;
  journey: LinkJourney | null;
  locations: ProviderLocations | null;
}): PortalCardItem[] {
  const cards = journey
    ? linkJourneyCards({ token: linkKey, journey, provider: space.provider })
    : [];
  const quiet = Boolean(journey && journey.roles.length > 0);
  const post =
    !quiet ||
    space.steps.length > 0 ||
    space.requests.length > 0 ||
    space.versions.length > 0;
  const open = space.requests.some((r) => r.status !== "treated");
  if (post)
    cards.push({
      id: "ps-space",
      title: fr.portal.provider.post,
      state: open ? "todo" : space.approved ? "done" : "waiting",
      action: open ? { label: t.corrections.title } : null,
      order: 50,
      body: (
        <>
          <p className="text-muted-foreground">
            {t.intro(space.provider, space.deliverable, space.project)}{" "}
            {t.until(formatDate(space.expiresAt))}
          </p>
          <ProviderSpaceView
            token={linkKey}
            space={space}
            locations={locations}
            quiet={quiet}
          />
        </>
      ),
    });
  return cards.map((c) => ({ ...c, workflow: "marketing" as const }));
}
