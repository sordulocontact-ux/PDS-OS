import { PageSection } from "@/components/shell/page-section";
import { reserveText } from "@/lib/activations/describe";
import type { ActivationSummary } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { activations } from "@/lib/i18n/fr/activations";
import { formatDate } from "@/lib/release/format";

import {
  CloseActivationButton,
  ReopenActivationButton,
} from "./closure-buttons";

const fr = { activations };

const t = fr.activations.closure;

/** The closure : open activations offer it with their reserves ; a closed
 * one says how and by whom, keeps its reserves visible and may reopen. */
export function ClosureSection({
  activation: a,
  members,
  canWrite,
  canReopen,
}: {
  activation: ActivationSummary;
  members: Member[];
  canWrite: boolean;
  canReopen: boolean;
}) {
  if (a.status === "cancelled") return null;
  const reserves = a.reserves.map((r) => ({ ...r, label: reserveText(r) }));
  if (a.status === "closed") {
    const who = members.find((m) => m.personId === a.closedBy)?.name ?? "—";
    const kept = a.closureReserves ?? [];
    return (
      <PageSection
        id="closure"
        title={t.title}
        card
        action={
          canReopen && (
            <ReopenActivationButton
              projectId={a.projectId}
              activationId={a.id}
            />
          )
        }
      >
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">
            {t.closedOn(
              t.kinds[a.closureKind ?? "definitive"],
              who,
              formatDate(a.closedAt ?? a.updatedAt),
            )}
          </p>
          {a.closureNote && <p>{a.closureNote}</p>}
          {kept.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              {kept.map((r) => (
                <li key={r.key}>{reserveText(r)}</li>
              ))}
            </ul>
          )}
        </div>
      </PageSection>
    );
  }
  return (
    <PageSection
      id="closure"
      title={t.title}
      action={
        canWrite && (
          <CloseActivationButton
            projectId={a.projectId}
            activationId={a.id}
            reserves={reserves}
          />
        )
      }
    >
      {reserves.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noReserves}</p>
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {reserves.map((r) => (
            <li key={r.key}>{r.label}</li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
