import type { ReactNode } from "react";

import type { ActivationSummary } from "@/lib/activations/types";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";

import { DerivedProofBox } from "./derived-proof-box";
import { ModuleLine } from "./module-line";
import { NowTools } from "./now-tools";

const fr = { activationJourney };

const t = fr.activationJourney.now;

/**
 * « Maintenant » of the open activation (proto nowbox): the viewer's gesture
 * of the trunk in place (`gesture`), then every other line — the viewer's
 * first (« À vous · … · plus bas »), then who else is expected — and, for
 * the trunk's next action, « Créer une tâche » / « Sans objet ». A campaign
 * in house declared done shows its computed proof first.
 */
export function NowBox({
  projectId,
  activation: a,
  gesture,
  taskRules,
  showTools,
}: {
  projectId: string;
  activation: ActivationSummary;
  // The trunk's form when it is the viewer's turn.
  gesture: ReactNode;
  // Rules already turned into a task (« tâche créée dans Travail »).
  taskRules: readonly string[];
  // The viewer may manage the next action (its person, or a writer).
  showTools: boolean;
}) {
  const trunk = a.actions.find((x) => x.key.startsWith("trunk:")) ?? null;
  const lines = a.actions.filter((x) => !(gesture && x === trunk));
  const proofBox =
    a.derived && a.status === "done_declared" && a.proof !== "verified";
  const tools =
    trunk?.rule && showTools && a.status !== "suspended" ? (
      <NowTools
        projectId={projectId}
        activationId={a.id}
        rule={trunk.rule}
        todo={trunk.todo}
        person={trunk.who}
        dueOn={a.dueOn}
        skip={trunk.skip ?? null}
        taskCreated={taskRules.includes(trunk.rule)}
      />
    ) : null;
  if (!gesture && lines.length === 0 && !tools && !proofBox) return null;
  return (
    <section
      id="now"
      aria-label={t.title}
      className="flex scroll-mt-5 flex-col gap-2.5 rounded-xl bg-[var(--surface-soft)] p-4"
    >
      <h3 className="text-[length:var(--type-body-sm)] font-semibold text-[color:var(--text-tertiary)]">
        {t.title}
      </h3>
      {proofBox && a.derived && <DerivedProofBox proof={a.derived} />}
      {gesture}
      {lines.length > 0 && (
        <div className="flex flex-col gap-2">
          {lines.map((x) => (
            <ModuleLine key={x.key} action={x} />
          ))}
        </div>
      )}
      {!gesture && !lines.some((x) => x.who.viewer) && !proofBox && (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.nothing}
        </p>
      )}
      {tools}
    </section>
  );
}
