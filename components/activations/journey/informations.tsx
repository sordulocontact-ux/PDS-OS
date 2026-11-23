import { EvidenceSection } from "@/components/activations/evidence/evidence-section";
import { BlockersSection } from "@/components/activations/pilot/blockers-section";
import { ClosureSection } from "@/components/activations/pilot/closure-section";
import { DependenciesSection } from "@/components/activations/pilot/dependencies-section";
import { IdentitySection } from "@/components/activations/pilot/identity-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { canWriteActivation } from "@/lib/activations/access";
import { loadDependencyOptions } from "@/lib/activations/dependency-options";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadActivationFiles } from "@/lib/activations/files/queries";
import type { Access } from "@/lib/auth/access";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { activations } from "@/lib/i18n/fr/activations";
import { measureTone, proofTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { activations, activationJourney };

const t = fr.activationJourney.infos;
const ta = fr.activations;

/**
 * « Informations », folded (proto details.infos): type, lever, owner, due
 * date, proof and statistics computed — then what the ticket « pilotage »
 * keeps at hand: identity (« Modifier »), blockers, dependencies, every
 * proof with its checks, the closure.
 */
export async function Informations({
  fiche,
  access,
  briefVersion,
}: {
  fiche: ActivationFiche;
  access: Access;
  briefVersion: number | null;
}) {
  const {
    activation: a,
    board,
    members,
    canWrite,
    canValidate,
    project,
  } = fiche;
  const [options, files] = await Promise.all([
    canWrite ? loadDependencyOptions(project.id) : null,
    loadActivationFiles(a.id),
  ]);
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId: project.id,
    activationId: a.id,
  };
  const mine = <T extends { activationId: string }>(list: T[]) =>
    list.filter((x) => x.activationId === a.id);
  const owner = members.find((m) => m.personId === a.ownerPersonId)?.name;
  const canReopen = canWriteActivation(access, project, {
    ...a,
    status: "in_progress",
  });
  return (
    <Fold summary={t.title}>
      <FactRows>
        <FactRow
          label={t.type}
          value={[ta.kinds[a.kind], a.mode ? ta.modes[a.mode] : null]
            .filter(Boolean)
            .join(" · ")}
        />
        <FactRow
          label={t.lever}
          value={a.sourceLabel ?? t.manual}
          source={a.leverId ? t.leverSource(briefVersion) : null}
        />
        <FactRow
          label={t.owner}
          value={owner ?? t.toAppoint}
          missing={!owner}
        />
        <FactRow
          label={t.due}
          value={a.dueOn ? formatDay(a.dueOn) : t.toFix}
          missing={!a.dueOn}
        />
        <FactRow
          label={t.proof}
          value={a.derived?.text ?? null}
          state={{ tone: proofTone[a.proof], label: ta.proof.states[a.proof] }}
        />
        <FactRow
          label={t.stats}
          value={
            a.measure === "unavailable"
              ? t.statsUnavailable
              : a.lastFigure
                ? `${a.lastFigure} · ${t.lastSnapshot}`
                : null
          }
          state={{
            tone: measureTone[a.measure],
            label: ta.measure.states[a.measure],
          }}
        />
      </FactRows>
      <IdentitySection activation={a} members={members} canWrite={canWrite} />
      <BlockersSection
        projectId={project.id}
        activationId={a.id}
        alerts={a.alerts}
        blockers={mine(board.data.blockers)}
        members={members}
        canWrite={canWrite}
      />
      <DependenciesSection
        projectId={project.id}
        activationId={a.id}
        dependencies={mine(board.dependencies)}
        options={
          options ?? { deliverable: [], contract: [], clearance: [], task: [] }
        }
        canWrite={canWrite}
      />
      <EvidenceSection
        scope={scope}
        evidences={mine(board.data.evidences)}
        files={files}
        members={members}
        canWrite={canWrite}
        canVerify={canValidate}
        defaultKind={a.kind === "press" ? "coverage" : "publication"}
      />
      {a.status === "closed" && (
        <ClosureSection
          activation={a}
          members={members}
          canWrite={canWrite}
          canReopen={canReopen}
        />
      )}
    </Fold>
  );
}
