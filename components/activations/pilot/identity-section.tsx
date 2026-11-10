import { ActivationSection } from "@/components/activations/activation-section";
import { FactList } from "@/components/ui/fact-list";
import { launchGapsText } from "@/lib/activations/describe";
import { NOT_STARTED_STATUSES } from "@/lib/activations/model";
import type { ActivationSummary } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { activations } from "@/lib/i18n/fr/activations";
import { formatDate } from "@/lib/release/format";

import { IdentityActions } from "./identity-actions";

const fr = { activations };

const t = fr.activations;

/** Who, what for, when, what is expected ; the status and its reason. Unknown
 * fields say « Non renseigné », never a plausible value. */
export function IdentitySection({
  activation: a,
  members,
  canWrite,
}: {
  activation: ActivationSummary;
  members: Member[];
  canWrite: boolean;
}) {
  const owner = a.ownerPersonId
    ? (members.find((m) => m.personId === a.ownerPersonId)?.name ?? null)
    : t.noOwner;
  const period =
    a.startsOn && a.dueOn
      ? t.header.periodValue(formatDate(a.startsOn), formatDate(a.dueOn))
      : a.dueOn
        ? formatDate(a.dueOn)
        : null;
  return (
    <ActivationSection
      id="identity"
      title={t.identity.title}
      action={canWrite && <IdentityActions activation={a} members={members} />}
    >
      <FactList
        emptyLabel={t.notProvided}
        facts={[
          { label: t.identity.objective, value: a.objective },
          { label: t.identity.owner, value: owner },
          { label: t.identity.priority, value: t.priorities[a.priority] },
          { label: t.identity.period, value: period },
          {
            label: t.identity.expected,
            value: t.identity.expectedValue(
              a.evidenceExpected,
              a.metricsExpected,
            ),
          },
          ...(a.statusReason
            ? [{ label: t.status.reason, value: a.statusReason }]
            : []),
          ...(NOT_STARTED_STATUSES.includes(a.status)
            ? [
                {
                  label: t.status.launch.label,
                  value:
                    a.launchGaps.length === 0
                      ? t.status.launch.ready
                      : t.status.launch.missing(launchGapsText(a.launchGaps)),
                },
              ]
            : []),
          ...(a.description
            ? [{ label: t.identity.description, value: a.description }]
            : []),
        ]}
      />
    </ActivationSection>
  );
}
