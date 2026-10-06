import { AcknowledgeButton } from "@/components/master-workflow/acknowledge-button";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { sectionCardClass } from "@/components/ui/section-card";
import { fr } from "@/lib/i18n/fr";
import type { PublicPackage } from "@/lib/master-workflow/transmission-public";
import { formatShortDate } from "@/lib/release/format";

type Open = Extract<PublicPackage, { state: "open" | "received" }>;

/**
 * The package as the mix engineer opens it, without an account: the label's
 * message, the files of each title (signed links, as long as the link
 * lives), what is expected, then the confirmation of the reception.
 */
export function PublicPackageView({
  token,
  data,
}: {
  token: string;
  data: Open;
}) {
  const t = fr.masterWorkflow.publicPackage;
  const p = fr.masterWorkflow.mix.package;
  const pack = data.package;
  const date = (value: string | null) =>
    value ? formatShortDate(value) : null;
  return (
    <div className="flex flex-col gap-6">
      {data.feedback.length > 0 && (
        <section className={sectionCardClass}>
          <h2 className="text-base font-medium">{t.feedback}</h2>
          <ul className="mt-4 flex flex-col gap-5">
            {data.feedback.map((item) => (
              <li key={`${item.title}-${item.number}`} className="grid gap-1">
                <p className="text-sm font-medium">
                  {t.feedbackOf(
                    item.title,
                    item.number,
                    formatShortDate(item.sentAt),
                  )}
                </p>
                <p className="text-sm whitespace-pre-wrap">{item.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.note && (
        <section className={sectionCardClass}>
          <h2 className="text-base font-medium">{t.from}</h2>
          <p className="mt-2 text-sm whitespace-pre-wrap">{data.note}</p>
        </section>
      )}
      <section className={sectionCardClass}>
        <h2 className="text-base font-medium">{t.files}</h2>
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
            </li>
          ))}
        </ul>
      </section>
      <section className={sectionCardClass}>
        <h2 className="mb-4 text-base font-medium">{t.brief}</h2>
        <FactList
          emptyLabel={p.none}
          facts={[
            ...(pack.role === "mix"
              ? [
                  { label: p.mixV1Due, value: date(pack.mixV1Due) },
                  { label: p.mixFinalDue, value: date(pack.mixFinalDue) },
                ]
              : [
                  { label: p.masteringDue, value: date(pack.masteringDue) },
                  { label: p.masterFinalDue, value: date(pack.masterFinalDue) },
                ]),
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
      </section>
      {data.state === "received" && data.acknowledgedAt ? (
        <p className="text-sm font-medium">
          {t.received(formatShortDate(data.acknowledgedAt))}
        </p>
      ) : (
        <AcknowledgeButton token={token} />
      )}
      <p className="text-caption text-[color:var(--text-secondary)]">
        {t.expires(formatShortDate(data.expiresAt))}
      </p>
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
