import { ContactLinksSection } from "@/components/portal/contact-links-section";
import type { RoleRow } from "@/components/shell/module/roles-panel";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import type { DistributionContext } from "@/lib/distribution/journey-context";
import { fr } from "@/lib/i18n/fr";

const t = fr.roles.distribution;

/**
 * « Qui fait quoi » of the Distribution (proto: Lina responsable, Claire
 * validatrice, The Orchard without a link — what it answers is declared),
 * with the changes of validator from the module's journal.
 */
export function DistributionRolesButton({ ctx }: { ctx: DistributionContext }) {
  const roles: RoleRow[] = [
    {
      key: "owner",
      label: t.owner,
      kind: "coord",
      holder: ctx.project.ownerName ? { name: ctx.project.ownerName } : null,
      what: t.ownerWhat,
    },
    {
      key: "validator",
      label: t.validator,
      kind: "valid",
      holder: ctx.validator
        ? {
            name: ctx.validator.name,
            detail: ctx.proposedValidator ? t.proposed : undefined,
          }
        : null,
      what: t.validatorWhat,
    },
    {
      key: "distributor",
      label: t.distributor,
      kind: "exec",
      holder: { name: fr.distributionJourney.distributor, detail: t.noLink },
      what: t.distributorWhat,
    },
  ];
  const history = ctx.closure.events
    .filter((e) => e.kind === "validator.set")
    .map((e) => ({
      id: e.id,
      text: t.validatorSet,
      who: e.actor,
      at: e.at,
    }));
  return (
    <WhoDoesWhatButton
      roles={roles}
      history={history}
      personLinks={<ContactLinksSection projectId={ctx.project.id} />}
    />
  );
}
