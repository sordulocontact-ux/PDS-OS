import Link from "next/link";

import { AudioFile } from "@/components/ui/audio-file";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { masterFinal } from "@/lib/i18n/fr/master-final";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import type { FinalTitle, FinalView } from "@/lib/master-workflow/final";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

import { DeliverableReceived } from "./deliverable-received";

const fr = { masterWorkflow, masterFinal };

const t = fr.masterFinal;
const labels = fr.masterWorkflow.brief.deliverables;
const h3 =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/**
 * The Master final step (proto `master:final`): per title, the file at the
 * Catalogue, listened to, its state and ISRC, where it comes from, what it
 * unlocks (Distribution, the SACEM bulletin's duration), then the other
 * deliverables of the Brief, expected or received.
 */
export function FinalStep({ view }: { view: FinalView }) {
  const missing = view.titles.reduce(
    (n, x) => n + x.deliverables.filter((d) => !d.received).length,
    0,
  );
  const allFinal =
    view.titles.length > 0 && view.titles.every((x) => x.final ?? x.before);
  return (
    <div className="flex flex-col gap-5">
      {view.titles.map((title) => (
        <TitleFinal
          key={title.id}
          title={title}
          view={view}
          several={view.titles.length > 1}
        />
      ))}
      {allFinal && (
        <ToneCallout tone={missing ? "info" : "success"}>
          {missing ? t.missing(missing) : t.done}
        </ToneCallout>
      )}
    </div>
  );
}

function TitleFinal({
  title,
  view,
  several,
}: {
  title: FinalTitle;
  view: FinalView;
  several: boolean;
}) {
  const file = title.final ?? title.before;
  return (
    <section className="flex flex-col gap-3">
      {several && <h3 className={h3}>« {title.title} »</h3>}
      {!file ? (
        <ToneCallout tone="info">{t.waiting}</ToneCallout>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="font-semibold break-all">{t.card(file.fileName)}</b>
              <StatusBadge
                tone={
                  title.audioState === "final_master" ? "success" : "neutral"
                }
                size="sm"
              >
                {title.audioState === "final_master" ? t.atCatalogue : t.notYet}
              </StatusBadge>
            </div>
            <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
              {title.final
                ? t.validated(
                    title.final.number,
                    title.final.decidedBy,
                    formatShortDay(title.final.decidedAt, { bare: true }),
                  )
                : t.before(
                    formatShortDay(title.before?.addedAt ?? "", { bare: true }),
                  )}
            </p>
            <AudioFile
              label={t.card(file.fileName)}
              listenUrl={file.listenUrl}
              downloadUrl={file.downloadUrl}
            />
          </div>
          <FactRows>
            <FactRow
              label={t.catalogue}
              value={t.catalogueValue(title.title, title.isrc)}
              source={t.catalogueSource}
            />
            <FactRow
              label={t.lineage}
              value={
                <span className="flex flex-col">
                  {title.lineage.source && (
                    <span>
                      {t.lineageSource(title.lineage.source.fileName)}
                    </span>
                  )}
                  {title.lineage.mixFinal && (
                    <span>
                      {t.lineageMix(
                        title.lineage.mixFinal.number,
                        title.lineage.mixFinal.fileName,
                      )}
                    </span>
                  )}
                  {title.final && (
                    <span>
                      {t.lineageMaster(
                        title.final.number,
                        title.final.fileName,
                      )}
                    </span>
                  )}
                </span>
              }
            />
            <FactRow
              label={t.unlocks}
              value={
                <span className="flex flex-col">
                  <span>{t.unlocksDistribution}</span>
                  <span>{t.unlocksLegal(title.durationSeconds)}</span>
                </span>
              }
              source={t.unlocksSource}
              side={
                <Link
                  href={routes.projectRelease(view.projectId)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ButtonRoll>{t.toDistribution}</ButtonRoll>
                </Link>
              }
            />
          </FactRows>
        </>
      )}
      {title.deliverables.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>{t.deliverables}</h3>
          <FactRows>
            {title.deliverables.map((d) => (
              <FactRow
                key={d.key}
                label={labels[d.key]}
                value={
                  d.fileName ? (
                    <b className="font-semibold break-all">{d.fileName}</b>
                  ) : d.received ? (
                    t.received
                  ) : (
                    t.expected
                  )
                }
                source={
                  d.viaLink && d.at
                    ? t.receivedVia(formatShortInstant(d.at), view.engineer)
                    : d.received
                      ? t.receivedSource(null)
                      : t.expectedSource
                }
                state={
                  d.received
                    ? { tone: "success", label: t.received }
                    : { tone: "neutral", label: t.expected }
                }
                side={
                  view.canEdit &&
                  !d.received && (
                    <DeliverableReceived
                      projectId={view.projectId}
                      masterId={title.id}
                      deliverable={d.key}
                    />
                  )
                }
              />
            ))}
          </FactRows>
          {view.engineer &&
            title.final &&
            title.deliverables.some((d) => !d.received) && (
              <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {t.waitingEngineer(
                  view.engineer,
                  title.deliverables.filter((d) => !d.received).length,
                )}
              </p>
            )}
        </section>
      )}
    </section>
  );
}
