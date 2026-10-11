import { PageSection } from "@/components/shell/page-section";
import type { Attachable } from "@/lib/activations/attachables";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

import { NewActivationButton } from "./new-activation-button";

const t = fr.activations;

/** What the Stratégie and the Production decided with no activation yet;
 * one click opens the creation form with the source linked. */
export function AttachSection({
  projectId,
  items,
  members,
  canCreate,
}: {
  projectId: string;
  items: Attachable[];
  members: Member[];
  canCreate: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <PageSection
      id="attach"
      title={t.attach.title}
      description={t.attach.description}
    >
      <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border bg-card">
        {items.map((item) => (
          <li
            key={`${item.sourceKind}:${item.sourceId}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 flex-col">
              <span className="font-medium break-words">{item.label}</span>
              <span className="text-sm text-muted-foreground">
                {t.attach[item.sourceKind]} · {t.kinds[item.kind]}
                {item.existing > 0 && ` · ${t.attach.existing(item.existing)}`}
              </span>
            </div>
            {canCreate && (
              <NewActivationButton
                projectId={projectId}
                members={members}
                source={{
                  kind: item.sourceKind,
                  id: item.sourceId,
                  label: item.label,
                  proposedKind: item.kind,
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
