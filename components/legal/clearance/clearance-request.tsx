import { StepSection } from "@/components/shell/journey/step-section";
import { ContactCard } from "@/components/network/contact-card";
import { HolderToNetworkButton } from "@/components/legal/clearance/holder-to-network-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { rightsOf } from "@/lib/legal/clearance/matrix";
import { rightState } from "@/lib/legal/clearance/right-states";
import type { Clearance } from "@/lib/legal/clearance/types";
import { rightStateTone } from "@/lib/ui/state-tones";

const fr = { legalClearance };

/**
 * « La demande » then « Deux autorisations distinctes » (recette Juridique
 * V1, JUR-09): what is taken of which work, each right's holder, then each
 * right apart with where it stands — conditions accepted are not an
 * authorisation (JUR-10) — and with whom: their contact card, e-mail
 * address in view (`ContactCard`, 09/11/2026).
 */
export function ClearanceRequest({
  projectId,
  clearance,
  editable,
}: {
  projectId: string;
  clearance: Clearance;
  // Open borrowing: a name-only holder can be added to the Réseau.
  editable: boolean;
}) {
  const t = fr.legalClearance.request;
  const rights = rightsOf(clearance.scope);
  const holdersOf = (right: string) =>
    clearance.holders
      .filter((h) => h.right === right)
      .map((h) => h.name)
      .join(", ");
  return (
    <>
      <StepSection title={t.title}>
        <FactRows>
          <FactRow
            label={t.element}
            value={clearance.element}
            source={clearance.usage ?? undefined}
          />
          <FactRow
            label={t.work}
            value={
              clearance.author
                ? `« ${clearance.work} » (${clearance.author})`
                : `« ${clearance.work} »`
            }
          />
          {rights.map((right) => (
            <FactRow
              key={right}
              label={t.holder(t.rightOf[right])}
              value={holdersOf(right) || null}
              // Red only while nobody holds it (« À identifier »).
              missing={!holdersOf(right)}
              missingLabel={t.noHolder}
            />
          ))}
        </FactRows>
      </StepSection>
      {rights.length > 0 && (
        <StepSection title={t.rightsTitle(rights.length)}>
          <div className="flex flex-col gap-2">
            {rights.flatMap((right) => {
              const state = rightState(clearance, right);
              const badge = (
                <StatusBadge tone={rightStateTone[state]} size="sm">
                  {t.states[state]}
                </StatusBadge>
              );
              const holders = clearance.holders.filter(
                (h) => h.right === right,
              );
              // Each right with whom it is dealt: their address in view
              // (Sacha, 09/11/2026).
              return holders.length > 0
                ? holders.map((h) => (
                    <ContactCard
                      key={h.id}
                      name={h.name}
                      kind={h.kind}
                      contactId={h.contactId}
                      email={h.email}
                      context={t.rightLabel[right]}
                      action={
                        <>
                          {badge}
                          {editable && !h.contactId && (
                            <HolderToNetworkButton
                              projectId={projectId}
                              holderId={h.id}
                              name={h.name}
                              role={h.role}
                              email={h.email}
                            />
                          )}
                        </>
                      }
                    />
                  ))
                : [
                    <FactRows key={right}>
                      <FactRow
                        label={t.rightLabel[right]}
                        value={t.noHolder}
                        state={{
                          tone: rightStateTone[state],
                          label: t.states[state],
                        }}
                      />
                    </FactRows>,
                  ];
            })}
          </div>
        </StepSection>
      )}
    </>
  );
}
