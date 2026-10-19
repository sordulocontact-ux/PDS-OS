import { InfluenceCollaboration } from "@/components/activations/influence/influence-collaboration";
import { AddTargetButton } from "@/components/activations/targets/add-target-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { VersionCard } from "@/components/ui/version-card";
import { collabAction } from "@/lib/activations/actors";
import { collaborationsOf } from "@/lib/activations/campaign";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { campaignConcept } from "@/lib/activations/levers";
import type { ActivationPeople } from "@/lib/activations/people";
import { loadTargets } from "@/lib/activations/targets";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { collaborationStageTone } from "@/lib/ui/state-tones";

import { ModuleLine } from "./module-line";

const t = fr.activationJourney.influence;

const OUT = ["refused", "no_response", "abandoned", "cancelled", "declined"];

/**
 * Influence in house, in the activation's page (proto influenceSection):
 * the campaign's concept read from the Brief de sortie, the creators
 * counted, « Choisir des créateurs », then one folded card per creator with
 * its step — open when a gesture awaits the viewer — its next line, and its
 * whole fiche (concept, negotiation, agreement, contents, publication,
 * payment, journal).
 */
export async function InfluenceBlock({
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
  const { activation: a, board, project, canWrite } = fiche;
  const [targets, concept] = await Promise.all([
    loadTargets(a.id),
    campaignConcept(project.id),
  ]);
  const collabs = collaborationsOf(a.id, board.modules, board.data.evidences);
  const owner = a.ownerPersonId
    ? people.person(a.ownerPersonId)
    : people.projectOwner;
  const open = a.status !== "closed" && a.status !== "cancelled";
  const verified = collabs.filter((c) =>
    ["published_verified", "administration", "closed"].includes(c.stage),
  ).length;
  const out = collabs.filter((c) => OUT.includes(c.stage)).length;
  return (
    <section
      id="module"
      className="flex scroll-mt-5 flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{t.title}</h3>
        {canWrite && open && (
          <AddTargetButton
            projectId={project.id}
            activationId={a.id}
            press={false}
          />
        )}
      </div>
      <FactRows>
        <FactRow
          label={t.concept}
          value={concept ?? t.conceptMissing}
          missing={!concept}
          source={concept ? t.conceptSource(briefVersion) : null}
        />
        <FactRow
          label={t.creators}
          value={
            collabs.length > 0
              ? t.creatorsCount(collabs.length, verified, out)
              : t.none
          }
        />
      </FactRows>
      {collabs.map((c) => {
        const target = targets.find((x) => x.id === c.targetId);
        if (!target) return null;
        const next = collabAction(c, {
          owner,
          direction: people.direction,
          creative: people.creative,
        });
        return (
          <VersionCard
            key={c.targetId}
            id={`collab-${c.targetId}`}
            title={[
              target.contactName,
              target.tiktok ? `@${target.tiktok}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            status={{
              tone: collaborationStageTone[c.stage],
              label: fr.activationInfluence.stages[c.stage],
            }}
            meta={
              target.tiktok ? "TikTok" : target.instagram ? "Instagram" : null
            }
            defaultOpen={Boolean(next?.who.viewer)}
            className="scroll-mt-5"
          >
            {next && <ModuleLine action={next} here />}
            <InfluenceCollaboration
              fiche={fiche}
              target={target}
              access={access}
              inCard
            />
          </VersionCard>
        );
      })}
    </section>
  );
}
