import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import { VersionCard } from "@/components/ui/version-card";
import type { ActivationFile } from "@/lib/activations/files/queries";
import type { EvidenceKind, EvidenceSource } from "@/lib/activations/model";
import { evidenceState } from "@/lib/activations/states";
import type { ActivationScope, EvidenceRecord } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { activations } from "@/lib/i18n/fr/activations";
import { formatDate } from "@/lib/release/format";
import { proofTone } from "@/lib/ui/state-tones";

import { DeclareEvidenceButton } from "./declare-evidence-button";
import { EvidenceActions } from "./evidence-actions";

const fr = { activations };

const t = fr.activations.evidence;

/**
 * The proofs of an activation, a collaboration or a press target: each with
 * its declaration (who says so, when) and its checks, newest first. A failed
 * check or a withdrawal never erases the declaration.
 */
export function EvidenceSection({
  scope,
  evidences,
  files,
  members,
  canWrite,
  canVerify,
  targetId = null,
  defaultKind,
  defaultSource,
  title = t.title,
}: {
  scope: ActivationScope;
  evidences: EvidenceRecord[];
  files: Map<string, ActivationFile>;
  members: Member[];
  canWrite: boolean;
  canVerify: boolean;
  targetId?: string | null;
  defaultKind: EvidenceKind;
  defaultSource?: EvidenceSource;
  title?: string;
}) {
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? fr.activations.system;
  return (
    <ActivationSection
      id="evidence"
      title={title}
      description={t.description}
      action={
        canWrite && (
          <DeclareEvidenceButton
            scope={scope}
            targetId={targetId}
            defaultKind={defaultKind}
            defaultSource={defaultSource}
          />
        )
      }
    >
      {evidences.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-3">
          {evidences.map((e) => {
            const state = evidenceState({
              id: e.id,
              targetId: e.targetId,
              withdrawn: e.withdrawnAt !== null,
              lastCheck: e.checks[0]?.result ?? null,
            });
            const file = e.fileId ? files.get(e.fileId) : undefined;
            return (
              <VersionCard
                key={e.id}
                title={`${t.kinds[e.kind]}${e.platform ? ` · ${e.platform}` : ""}${e.declaredOn ? ` · ${formatDate(e.declaredOn)}` : ""}`}
                status={{
                  tone: e.withdrawnAt ? "neutral" : proofTone[state],
                  label: e.withdrawnAt
                    ? t.withdrawnLabel
                    : e.checks[0]
                      ? t.results[e.checks[0].result]
                      : t.unverified,
                }}
                meta={`${t.sources[e.declaredSource]} — ${t.by(nameOf(e.createdBy), formatDate(e.createdAt))}`}
                defaultOpen={!e.withdrawnAt && e.checks.length === 0}
              >
                {(e.url || file) && (
                  <p className="flex flex-wrap gap-x-4 text-body-sm">
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all underline underline-offset-4"
                      >
                        {e.url}
                      </a>
                    )}
                    {file?.href && (
                      <a
                        href={file.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {t.openFile} · {file.fileName}
                      </a>
                    )}
                  </p>
                )}
                {e.note && <p className="text-body-sm break-words">{e.note}</p>}
                {e.withdrawnReason && (
                  <p className="text-body-sm text-[color:var(--text-secondary)]">
                    {t.withdrawnLabel} : {e.withdrawnReason}
                  </p>
                )}
                {e.checks.length > 0 && (
                  <ul className="flex flex-col gap-1 border-l-2 border-[color:var(--border-hairline)] pl-3 text-body-sm text-[color:var(--text-secondary)]">
                    {e.checks.map((c) => (
                      <li key={c.id}>
                        {t.lastCheck(
                          t.results[c.result],
                          nameOf(c.checkedBy),
                          formatDate(c.checkedAt),
                        )}
                        {" · "}
                        {t.methods[c.method]}
                        {c.note && ` — ${c.note}`}
                      </li>
                    ))}
                  </ul>
                )}
                {!e.withdrawnAt && (canVerify || canWrite) && (
                  <EvidenceActions
                    projectId={scope.projectId}
                    evidenceId={e.id}
                    canVerify={canVerify || canWrite}
                    canWithdraw={canWrite}
                  />
                )}
              </VersionCard>
            );
          })}
        </div>
      )}
    </ActivationSection>
  );
}
