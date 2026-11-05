import { notFound } from "next/navigation";

import { DesignStepFrame } from "@/components/design/design-step-frame";
import { ReferenceGroup } from "@/components/design/refs/reference-group";
import {
  ReferenceTile,
  type TileReference,
} from "@/components/design/refs/reference-tile";
import { SimilarReferencesDialog } from "@/components/design/references/similar-references-dialog";
import { DesignWaits } from "@/components/design/waiting-row";
import { designJourneyContext } from "@/lib/design/journey-context";
import { DIRECTION_TARGET, targetKeyOf } from "@/lib/design/reference-rules";
import {
  loadReferenceViews,
  type ReferenceView,
} from "@/lib/design/references";
import { similarSetup } from "@/lib/design/similar-sources";
import { similarBases } from "@/lib/design/similar-rules";
import { fr } from "@/lib/i18n/fr";

const t = fr.designSteps.references;
const k = fr.conceptionKinds;

/**
 * Conception › Références (proto deR, ticket § 6): one group for the
 * release's direction, one per deliverable, then « À rattacher »; a
 * reference is one resource serving any number of them, proposed until the
 * direction that carries it is validated. Similar images (Sacha, 11/10)
 * stay a secondary action.
 */
export default async function DesignReferencesPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/references">) {
  const { projectId } = await params;
  const ctx = await designJourneyContext(projectId);
  if (!ctx) notFound();
  const { data } = ctx;
  const step = ctx.steps[2];
  const canEdit =
    data.canWrite &&
    ctx.directionPhase !== "pending" &&
    ctx.directionPhase !== "approved";
  const references = await loadReferenceViews(projectId, data.references, {
    linkThumbnails: true,
  });
  const options = [
    { key: DIRECTION_TARGET, label: fr.designSteps.intentions.direction },
    ...data.deliverables.map((d) => ({ key: d.id, label: d.title })),
  ];
  const labelOf = (key: string) =>
    options.find((o) => o.key === key)?.label ?? "";
  const tile = (r: ReferenceView, current: string | null): TileReference => {
    const keys = r.links.map(targetKeyOf);
    return {
      id: r.id,
      name: r.name,
      href: r.href,
      thumbnail: r.thumbnail,
      validated: r.status === "validated",
      kindLine: [k.types[r.type], r.usage ? k.usages[r.usage] : null]
        .filter(Boolean)
        .join(" · "),
      note: r.note,
      targets: keys,
      others: keys.filter((key) => key !== current).map(labelOf),
      credit: t.depositedBy(ctx.nameOf(r.createdBy) || "—"),
    };
  };
  const add = (target: string) =>
    canEdit
      ? { organizationId: data.organizationId, projectId, options, target }
      : null;
  const unattached = references.filter((r) => r.links.length === 0);

  return (
    <DesignStepFrame projectId={projectId} stepKey="references">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-body-sm text-[color:var(--text-secondary)]">
          {t.note}
        </p>
        {canEdit && (
          <SimilarReferencesDialog
            projectId={projectId}
            bases={similarBases(
              data.references,
              options,
              fr.conceptionRefs.similar.allImages,
            )}
            options={options}
            setup={similarSetup()}
          />
        )}
      </div>
      {options.map((o, i) => {
        const list = references.filter((r) =>
          r.links.some((l) => targetKeyOf(l) === o.key),
        );
        return (
          <ReferenceGroup
            key={o.key}
            id={`references-${o.key}`}
            title={o.label}
            status={{ tone: "neutral", label: t.count(list.length) }}
            add={add(o.key)}
            empty={
              list.length
                ? null
                : i === 0
                  ? t.emptyDirection
                  : t.emptyDeliverable
            }
          >
            {list.map((r) => (
              <ReferenceTile
                key={r.id}
                projectId={projectId}
                reference={tile(r, o.key)}
                options={options}
                canEdit={canEdit}
              />
            ))}
          </ReferenceGroup>
        );
      })}
      {unattached.length > 0 && (
        <ReferenceGroup
          id="references-unattached"
          title={t.unattached}
          status={{ tone: "warning", label: t.toAttach(unattached.length) }}
          add={null}
          empty={null}
        >
          {unattached.map((r) => (
            <ReferenceTile
              key={r.id}
              projectId={projectId}
              reference={tile(r, null)}
              options={options}
              canEdit={canEdit}
            />
          ))}
        </ReferenceGroup>
      )}
      <DesignWaits step={step} actors={[step.actor]} />
    </DesignStepFrame>
  );
}
