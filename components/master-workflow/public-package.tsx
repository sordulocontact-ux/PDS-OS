import { DeliverVersion } from "@/components/master-workflow/deliver-version";
import { TakeChargeForm } from "@/components/master-workflow/take-charge-form";
import { PublicRefresh } from "@/components/master-workflow/public-refresh";
import { PublicVersions } from "@/components/master-workflow/public-versions";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { Fold } from "@/components/ui/fold";
import { sectionCardClass } from "@/components/ui/section-card";
import { fr } from "@/lib/i18n/fr";
import type { PublicPackage } from "@/lib/master-workflow/transmission-public";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/release/format";

type Open = Extract<PublicPackage, { state: "open" | "received" }>;

/**
 * « Votre dossier », as the engineer opens it without an account: the
 * label's message, the files of each title (signed links, as long as the
 * link lives; « Nouvelle source le … » when the final vocals replaced it)
 * and what is expected. « Prendre en charge le dossier » comes before it
 * (PackageTakeCharge, lot 6 of Ibé's feedback).
 */
export function PublicPackageView({
  token,
  data,
}: {
  token: string;
  data: Open;
}) {
  const t = fr.masterWorkflow.publicPackage;
  const th = fr.masterWorkflow.engineerThread;
  const p = fr.masterWorkflow.mix.package;
  const pack = data.package;
  const date = (value: string | null) =>
    value ? formatShortDate(value) : null;
  return (
    <div className="flex flex-col gap-6">
      {data.continued && <p className="text-sm font-medium">{t.continued}</p>}
      {data.note && (
        <section className={sectionCardClass}>
          <h2 className="text-base font-medium">{t.from}</h2>
          <p className="mt-2 text-sm whitespace-pre-wrap">{data.note}</p>
        </section>
      )}
      {/* Folded or not, the reader's choice survives the page's refresh
          (PROJ-AMEL-02): the summary says what is inside. */}
      <details open className={cn(sectionCardClass, "group")}>
        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 marker:hidden">
          <h2 className="text-base font-medium">{t.files}</h2>
          <span className="text-sm text-[color:var(--text-secondary)]">
            {th.sections.summaryFiles(pack.titles.length)}
          </span>
        </summary>
        <ul className="mt-4 flex flex-col gap-5">
          {pack.titles.map((title) => (
            <li key={title.title} className="flex flex-col gap-2">
              <p className="font-medium">
                {title.title}
                <span className="text-[color:var(--text-secondary)]">
                  {" "}
                  · {title.artists}
                </span>
              </p>
              <FileLine
                label={t.source[pack.role](title.source.state)}
                file={title.source}
              />
              {title.stems.map((stem) => (
                <FileLine key={stem.url} label={t.stem} file={stem} />
              ))}
              {title.sourceUpdatedAt && (
                <p className="text-sm font-medium">
                  {fr.masterRound.portal.newSource(
                    formatShortDate(title.sourceUpdatedAt),
                    title.source.fileName,
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      </details>
      <details open className={sectionCardClass}>
        <summary className="mb-4 flex cursor-pointer list-none items-baseline justify-between gap-3 marker:hidden">
          <h2 className="text-base font-medium">{t.brief}</h2>
          <span className="text-sm text-[color:var(--text-secondary)]">
            {th.sections.summaryBrief(
              [
                pack.mixV1Due,
                pack.mixFinalDue,
                pack.masteringDue,
                pack.masterFinalDue,
                pack.releaseDue,
              ].filter(Boolean).length,
            )}
          </span>
        </summary>
        <FactList
          emptyLabel={p.none}
          facts={[
            // Every date of the Brief, each with its meaning (PROJ-BUG-07):
            // a package sent before shows the ones it carried.
            ...[
              { label: p.mixV1Due, value: date(pack.mixV1Due) },
              { label: p.mixFinalDue, value: date(pack.mixFinalDue) },
              { label: p.masteringDue, value: date(pack.masteringDue) },
              { label: p.masterFinalDue, value: date(pack.masterFinalDue) },
              { label: p.releaseDue, value: date(pack.releaseDue) },
            ].filter((fact) => fact.value !== null),
            { label: p.formats, value: pack.formats },
            {
              label: p.revisions,
              value: pack.revisions === null ? null : String(pack.revisions),
            },
            {
              label: p.deliverables,
              value: pack.deliverables.join(", ") || null,
            },
            { label: p.direction, value: pack.direction },
            { label: p.references, value: pack.references },
            { label: p.constraints, value: pack.constraints },
          ]}
        />
      </details>
      <p className="text-caption text-[color:var(--text-secondary)]">
        {t.expires(formatShortDate(data.expiresAt))}
      </p>
      <PublicRefresh />
    </div>
  );
}

/**
 * « Prendre en charge le dossier » with the rate, first on the engineer's
 * page until it is done; then the day it was taken.
 */
export function PackageTakeCharge({
  token,
  data,
}: {
  token: string;
  data: Open;
}) {
  const pack = data.package;
  if (data.state === "received" && data.acknowledgedAt)
    return (
      <p className="text-sm font-medium">
        {fr.masterRound.take.taken(formatShortDate(data.acknowledgedAt))}
      </p>
    );
  return (
    <TakeChargeForm
      token={token}
      estimate={{
        [pack.role]: data.estimate?.[pack.role] ?? null,
        // The mix link of the engineer who masters too: both rates.
        ...(pack.role === "mix" && data.estimate?.mastering != null
          ? { mastering: data.estimate.mastering }
          : {}),
      }}
    />
  );
}

/**
 * « Déposer votre version » for each title still expected, first; then the
 * versions the engineer delivered with what the label sent and decided,
 * and the way back to the files of the package (lot 6 of Ibé's feedback).
 */
export function PublicDeliveries({
  token,
  data,
  expects,
}: {
  token: string;
  data: Open;
  // The title waits for a version from the engineer (none yet, or changes
  // asked): its drop zone shows.
  expects: (masterId: string) => boolean;
}) {
  const t = fr.masterWorkflow.publicPackage;
  const pack = data.package;
  const deposit = (title: Open["package"]["titles"][number]) =>
    title.masterId ? (
      <div key={title.title} className="flex flex-col gap-2">
        {pack.titles.length > 1 && <p className="font-medium">{title.title}</p>}
        {data.deliveries
          .filter((d) => d.masterId === title.masterId)
          .map((d) => (
            <p
              key={`${d.fileName}-${d.sentAt}`}
              className="text-sm text-[color:var(--text-secondary)]"
            >
              {t.deliver.sent(d.fileName, formatShortDate(d.sentAt))}
            </p>
          ))}
        <DeliverVersion
          token={token}
          masterId={title.masterId}
          role={pack.role}
        />
      </div>
    ) : null;
  const expected = pack.titles.filter((x) => x.masterId && expects(x.masterId));
  const others = pack.titles.filter((x) => x.masterId && !expects(x.masterId));
  return (
    <div className="flex flex-col gap-5">
      {expected.map(deposit)}
      <PublicVersions role={pack.role} versions={data.versions} />
      {/* Nothing asked: sending another version stays possible, folded. */}
      {others.length > 0 && (
        <Fold summary={fr.masterRound.portal.otherVersion}>
          {others.map(deposit)}
        </Fold>
      )}
      <a
        href="#ps-package"
        className="self-start text-sm font-medium text-[color:var(--text-secondary)] underline-offset-4 hover:text-foreground hover:underline"
      >
        {fr.masterRound.portal.seePackage}
      </a>
    </div>
  );
}

function FileLine({
  label,
  file,
}: {
  label: string;
  file: { fileName: string; url: string };
}) {
  const t = fr.masterWorkflow.publicPackage;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate">
        <span className="text-[color:var(--text-secondary)]">{label} · </span>
        {file.fileName}
      </span>
      <Button
        variant="outline"
        size="xs"
        nativeButton={false}
        render={<a href={file.url} download={file.fileName} rel="noreferrer" />}
      >
        {t.download}
      </Button>
    </div>
  );
}
