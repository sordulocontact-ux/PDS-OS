import { AgencyFile } from "@/components/activations/agency/agency-file";
import { AgencyReports } from "@/components/activations/agency/agency-reports";
import type { ActivationFiche } from "@/lib/activations/fiche";
import type { ActivationPeople } from "@/lib/activations/people";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";

import { InfluenceBlock } from "./influence-block";
import { PressBlock } from "./press-block";
import { PressFraming } from "./press-framing";

const t = fr.activationJourney.pressBlock;

/**
 * The module of the open activation, in its page (proto: one page, no
 * tabs): influence in house, RP in house, or the agency's file (influence
 * or RP); nothing for a content, an event or another action.
 */
export async function ActivationModule({
  fiche,
  access,
  people,
  briefVersion,
}: {
  fiche: ActivationFiche;
  access: Access;
  people: ActivationPeople;
  briefVersion: number | null;
}) {
  const a = fiche.activation;
  if (a.kind !== "influence" && a.kind !== "press") return null;
  if (a.mode === "internal")
    return a.kind === "influence" ? (
      <InfluenceBlock
        fiche={fiche}
        access={access}
        people={people}
        briefVersion={briefVersion}
      />
    ) : (
      <PressBlock fiche={fiche} access={access} />
    );
  return (
    <section
      id="module"
      className="flex scroll-mt-5 flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-4"
    >
      <h3 className="font-semibold">
        {a.kind === "press" ? t.agency : t.agencyInfluence}
      </h3>
      {a.kind === "press" && <PressFraming fiche={fiche} />}
      <AgencyFile fiche={fiche} access={access} />
      <AgencyReports fiche={fiche} access={access} />
    </section>
  );
}
