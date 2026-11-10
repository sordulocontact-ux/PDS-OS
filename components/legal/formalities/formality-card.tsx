import {
  BulletinDownload,
  bulletinGenerated,
} from "@/components/legal/formalities/bulletin-download";
import { DossierForm } from "@/components/legal/formalities/dossier-form";
import { OpenFormalityButton } from "@/components/legal/formalities/open-formality-button";
import { SignaturesSection } from "@/components/legal/formalities/signatures-section";
import { StepsPanel } from "@/components/legal/formalities/steps-panel";
import { DocumentCard } from "@/components/ui/document-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import { formalityTone } from "@/lib/ui/state-tones";
import { formatInstant } from "@/lib/utils/instant";

const fr = { legalDocuments, legalFormalities };

/** One title's SACEM 725, a document (Sacha, 09/11/2026: « pour la SACEM
 * c'est un peu un document ») — one `DocumentCard` per title: in its head
 * the title, the bulletin, when it was generated, where it stands and
 * « Télécharger »; in its body the dossier in its five sections — each miss
 * on its own line (JUR-02) —, the history. Under the card, not in it (Sacha,
 * 10/11/2026): the signatures, each signer's link card as on the Master,
 * then what follows (partial declaration, deposit, answer). */
export function FormalityCard({
  projectId,
  projectTitle,
  title,
}: {
  projectId: string;
  projectTitle: string;
  title: TitleFormality;
}) {
  const t = fr.legalFormalities;
  const f = title.formality;
  return (
    <div className="flex flex-col gap-6">
      <DocumentCard
        name={title.title}
        line={[t.definitions.SACEM_725_EDITED_WORK, f && bulletinGenerated(f)]
          .filter(Boolean)
          .join(" · ")}
        // Folded, a bulletin still says where it stands; folded on arrival
        // (Sacha, 10/11/2026), its signatures and next step read under it.
        collapsible
        defaultOpen={false}
        action={
          f ? (
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={formalityTone[f.status]}>
                {t.statuses[f.status]}
              </StatusBadge>
              <BulletinDownload title={title.title} f={f} />
            </span>
          ) : (
            <OpenFormalityButton
              projectId={projectId}
              masterId={title.masterId}
            />
          )
        }
      >
        {f && (
          // `section-card`: the pieces inside drop their own frame, as in a
          // section card.
          <div className="section-card flex flex-col gap-6 p-4 md:p-6">
            {(f.submittedAt || f.completedAt) && (
              <div className="flex flex-wrap items-center gap-2">
                {f.submittedAt && (
                  <span className="text-sm text-muted-foreground">
                    {t.page.submittedNote(formatInstant(f.submittedAt))}
                  </span>
                )}
                {f.completedAt && (
                  <span className="text-sm text-muted-foreground">
                    {t.page.completed(formatInstant(f.completedAt))}
                  </span>
                )}
              </div>
            )}
            {f.status === "rejected" && (
              <ToneCallout tone="danger">
                {t.page.rejected(
                  f.rejectedAt ? formatInstant(f.rejectedAt) : "",
                  f.rejectionReason ?? "",
                )}
              </ToneCallout>
            )}
            {f.reopened.length > 0 && (
              <ToneCallout tone="warning">
                {t.page.reopened(
                  f.reopened.map((k) => t.fields[k] ?? k).join(", "),
                )}
              </ToneCallout>
            )}
            {f.partialReason && (
              <ToneCallout tone="neutral">
                {t.page.partialDone(f.partialReason)}
              </ToneCallout>
            )}
            {/* The values in place, no fold: the signatures are under the
                card now (Sacha, 10/11/2026). */}
            <DossierForm projectId={projectId} title={title} />
            {f.history.length > 0 && (
              <section className="flex flex-col gap-2 border-t border-[color:var(--border-hairline)] pt-6">
                <h3 className="font-medium">{t.page.history}</h3>
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {f.history.map((e) => (
                    <li key={e.id}>
                      {[t.events[e.kind] ?? e.kind, e.by, formatInstant(e.at)]
                        .filter(Boolean)
                        .join(" · ")}
                      {e.note && (
                        <span className="text-foreground"> — {e.note}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </DocumentCard>
      {f && (
        <>
          <SignaturesSection
            projectId={projectId}
            projectTitle={projectTitle}
            f={f}
          />
          <StepsPanel projectId={projectId} f={f} />
        </>
      )}
    </div>
  );
}
