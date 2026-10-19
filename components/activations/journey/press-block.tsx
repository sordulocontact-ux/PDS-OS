import { EvidenceSection } from "@/components/activations/evidence/evidence-section";
import { MessagesSection } from "@/components/activations/messages/messages-section";
import { PrepareDraftsButton } from "@/components/activations/press/prepare-drafts-button";
import { PressTarget } from "@/components/activations/press/press-target";
import { AddTargetButton } from "@/components/activations/targets/add-target-button";
import { StatTiles } from "@/components/ui/stat-tiles";
import { VersionCard } from "@/components/ui/version-card";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadActivationFiles } from "@/lib/activations/files/queries";
import { loadMessages } from "@/lib/activations/messages/queries";
import { loadPressKit } from "@/lib/activations/press-kit";
import { loadOpportunities } from "@/lib/activations/press/queries";
import { loadTargets } from "@/lib/activations/targets";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { activationMessageTone } from "@/lib/ui/state-tones";

import { ModuleLine } from "./module-line";
import { PressFraming } from "./press-framing";

const t = fr.activationJourney.pressBlock;
const tp = fr.activationPress;

/**
 * RP in house in the activation's page (proto rpInternal): the framing and
 * the press kit, the common template then one draft per media, one folded
 * card per media (messages, follow-ups, interviews, coverage), the coverage
 * to verify, and « Bilan RP » counted by code.
 */
export async function PressBlock({
  fiche,
  access,
}: {
  fiche: ActivationFiche;
  access: Access;
}) {
  const {
    activation: a,
    project,
    board,
    members,
    canWrite,
    canValidate,
  } = fiche;
  const [targets, messages, opportunities, kit, files] = await Promise.all([
    loadTargets(a.id),
    loadMessages(a.id),
    loadOpportunities(a.id),
    loadPressKit(project.id),
    loadActivationFiles(a.id),
  ]);
  const open = a.status !== "closed" && a.status !== "cancelled";
  const template = messages.filter(
    (m) => m.targetId === null && m.kind === "pitch",
  );
  const pitched = new Set(
    messages.flatMap((m) =>
      m.targetId && m.kind === "pitch" && m.status !== "cancelled"
        ? [m.targetId]
        : [],
    ),
  );
  const toPrepare = targets.filter(
    (x) => !x.outcome && !pitched.has(x.id),
  ).length;
  const coverage = board.data.evidences.filter(
    (e) =>
      e.activationId === a.id && e.targetId !== null && e.kind === "coverage",
  );
  const liveCoverage = coverage.filter((e) => e.withdrawnAt === null);
  const verified = liveCoverage.filter(
    (e) => e.checks[0]?.result === "verified",
  );
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId: project.id,
    activationId: a.id,
  };
  const ofTarget = (id: string) =>
    messages.filter((m) => m.targetId === id).at(-1);
  const lines = new Map(
    a.actions
      .filter((x) => x.anchor?.startsWith("media-"))
      .map((x) => [x.anchor, x]),
  );
  return (
    <section
      id="module"
      className="flex scroll-mt-5 flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{t.internal}</h3>
        {canWrite && open && (
          <AddTargetButton projectId={project.id} activationId={a.id} press />
        )}
      </div>
      <PressFraming fiche={fiche} />
      <div id="template" className="scroll-mt-5">
        <MessagesSection
          projectId={project.id}
          activationId={a.id}
          targetId={null}
          messages={template}
          kinds={["pitch"]}
          defaults={{
            kind: "pitch",
            subject: tp.template.subject(project.title),
            body: tp.template.body(project.title, project.artistName),
          }}
          pressKitId={kit.approved?.id ?? null}
          members={members}
          canWrite={canWrite}
          today={todayInParis()}
          title={t.template}
          addAction={
            canWrite &&
            template.some((m) => m.status === "validated") &&
            toPrepare > 0 && (
              <PrepareDraftsButton
                projectId={project.id}
                activationId={a.id}
                count={toPrepare}
              />
            )
          }
        />
      </div>
      <h4 className="pt-2 font-semibold">{t.media(targets.length)}</h4>
      {targets.map((x) => {
        const last = ofTarget(x.id);
        const line = lines.get(`media-${x.id}`);
        return (
          <VersionCard
            key={x.id}
            id={`media-${x.id}`}
            title={x.contactName}
            status={
              x.outcome
                ? {
                    tone: "neutral",
                    label: fr.activationWork.targets.outcomes[x.outcome],
                  }
                : last
                  ? {
                      tone: activationMessageTone[last.status],
                      label: fr.activationWork.messages.statuses[last.status],
                    }
                  : { tone: "neutral", label: tp.targets.targeted }
            }
            meta={x.journalistName}
            defaultOpen={Boolean(line?.who.viewer)}
            className="scroll-mt-5"
          >
            {line && <ModuleLine action={line} here />}
            <PressTarget fiche={fiche} target={x} access={access} inCard />
          </VersionCard>
        );
      })}
      <div id="coverage" className="scroll-mt-5">
        <EvidenceSection
          scope={scope}
          evidences={coverage}
          files={files}
          members={members}
          canWrite={false}
          canVerify={canValidate}
          defaultKind="coverage"
          title={t.coverage}
        />
      </div>
      <h4 className="pt-2 font-semibold">{t.report}</h4>
      <StatTiles
        columns={4}
        stats={[
          { label: t.tiles.targets, value: String(targets.length) },
          {
            label: t.tiles.sent,
            value: String(
              messages.filter((m) => m.targetId && m.status === "sent_declared")
                .length,
            ),
          },
          {
            label: t.tiles.positive,
            value: String(opportunities.length),
          },
          {
            label: t.tiles.interviews,
            value: String(
              opportunities.filter((o) =>
                ["done", "broadcast_declared", "no_broadcast"].includes(
                  o.status,
                ),
              ).length,
            ),
          },
          {
            label: t.tiles.broadcasts,
            value: String(
              opportunities.filter((o) => o.status === "broadcast_declared")
                .length,
            ),
          },
          {
            label: t.tiles.coverage,
            value: t.coverageValue(verified.length, liveCoverage.length),
          },
          {
            label: t.tiles.missing,
            value: String(liveCoverage.length - verified.length),
          },
        ]}
      />
    </section>
  );
}
