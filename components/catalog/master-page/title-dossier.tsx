import { IconCheck, IconLock } from "nucleo-sharp-essential";

import { PageSection } from "@/components/shell/page-section";
import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/lib/auth/redirects";
import type { DossierRow } from "@/lib/catalog/master/dossier";
import type { MasterRights } from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { cn } from "@/lib/utils";

import { DossierAction, type DossierActionTarget } from "./dossier-action";

const fr = { masterPage };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";

/** What a row opens: to fill it, or to change it once it is done. */
export function dossierTarget(
  row: DossierRow,
  masterId: string,
  rights: MasterRights,
): DossierActionTarget | null {
  if (row.locked) return null;
  switch (row.key) {
    case "isrc":
      return { kind: "title" };
    case "rightsHolder":
    case "iswc":
      return { kind: "rights", rights };
    case "contributors":
      return row.done
        ? { kind: "link", href: routes.masterCredits(masterId) }
        : { kind: "contributor" };
    case "masterSplits":
    case "publishingSplits":
      return row.done
        ? { kind: "link", href: routes.masterCredits(masterId) }
        : {
            kind: "split",
            splitKind: row.key === "masterSplits" ? "master" : "publishing",
            available: row.remaining ?? 100,
          };
    case "declarations":
      return { kind: "link", href: routes.masterRights(masterId) };
    case "masterFile":
      return row.done
        ? null
        : { kind: "link", href: routes.masterAudio(masterId) };
  }
}

/** The verb that fills a row (« Renseigner l'ISRC », « Qualifier 5 organismes »). */
export function dossierVerb(row: DossierRow): string {
  const verbs = fr.masterPage.overview.dossier.verbs;
  return row.key === "declarations"
    ? verbs.declarations(row.toQualify ?? 0)
    : verbs[row.key];
}

/**
 * « Dossier du titre » (proto `docs/protos/titre.html`, Sacha 29/10/2026):
 * one row per piece — its value and where it stands, or « À renseigner »
 * and the gesture that fills it on the spot; the Master final locked until
 * it is validated in Audio. What the release needs first, then the rest.
 * Acting changes a row, never its place. Replaces the completeness list
 * and the identifiers of « Informations ».
 */
export function TitleDossier({
  masterId,
  rows,
  rights,
  canEdit,
}: {
  masterId: string;
  rows: DossierRow[];
  rights: MasterRights;
  canEdit: boolean;
}) {
  const t = fr.masterPage.overview.dossier;
  const done = rows.filter((r) => r.done).length;
  const groups = [
    { key: "release", title: t.release },
    { key: "later", title: t.later },
  ] as const;

  return (
    <PageSection
      card
      id="dossier"
      title={t.title}
      action={
        <span
          className={cn(
            caption,
            "flex items-center gap-2.5 text-[color:var(--text-secondary)] tabular-nums",
          )}
        >
          <span className="w-28">
            <ProgressBar
              value={done}
              max={rows.length}
              label={t.countLabel(done, rows.length)}
              size="sm"
            />
          </span>
          {t.count(done, rows.length)}
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const list = rows.filter((r) => r.group === group.key);
          const left = list.filter((r) => !r.done).length;
          return (
            <div key={group.key} className="flex flex-col">
              <h3
                className={cn(
                  caption,
                  "flex gap-1.5 pb-1.5 font-semibold text-[color:var(--text-secondary)]",
                )}
              >
                {group.title}
                <span className="font-medium text-[color:var(--text-tertiary)] tabular-nums">
                  {left > 0 ? t.left(left) : t.allDone}
                </span>
              </h3>
              <ul>
                {list.map((row) => (
                  <DossierLine
                    key={row.key}
                    masterId={masterId}
                    row={row}
                    rights={rights}
                    canEdit={canEdit}
                  />
                ))}
              </ul>
            </div>
          );
        })}
        <p
          className={cn(
            "text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]",
          )}
        >
          {t.legal}
        </p>
      </div>
    </PageSection>
  );
}

function DossierLine({
  masterId,
  row,
  rights,
  canEdit,
}: {
  masterId: string;
  row: DossierRow;
  rights: MasterRights;
  canEdit: boolean;
}) {
  const t = fr.masterPage.overview.dossier;
  const target = canEdit ? dossierTarget(row, masterId, rights) : null;
  const mono = row.key === "isrc" || row.key === "iswc";
  return (
    <li
      id={`dossier-${row.key}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-[color:var(--border-hairline)] py-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]"
    >
      <span className="flex items-center gap-2 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {row.done ? (
          <IconCheck
            aria-hidden
            className="size-4 shrink-0 text-[color:var(--tone-success-fg)]"
          />
        ) : row.locked ? (
          <IconLock
            aria-hidden
            className="size-4 shrink-0 text-[color:var(--text-tertiary)]"
          />
        ) : (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full border-[1.5px] border-dashed border-[color:var(--text-muted)]"
          />
        )}
        {t.labels[row.key]}
      </span>
      <span className="col-span-2 row-start-2 flex min-w-0 flex-col sm:col-span-1 sm:row-start-auto">
        {row.value ? (
          <span
            className={cn(
              "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] break-words",
              mono && "font-mono",
            )}
          >
            {row.value}
          </span>
        ) : (
          <span className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-tertiary)]">
            {row.locked ? t.masterFileLocked : t.missing}
          </span>
        )}
        {row.note && (
          <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
            {row.note}
          </span>
        )}
      </span>
      <span className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto">
        {target && (
          <DossierAction
            masterId={masterId}
            target={target}
            label={row.done ? t.edit : dossierVerb(row)}
            variant={row.done ? "ghost" : "outline"}
          />
        )}
      </span>
    </li>
  );
}
