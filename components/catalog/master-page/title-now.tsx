import { versionLabel } from "@/components/catalog/master-page/audio/audio-version-list";
import { NowFrame } from "@/components/shell/journey/now-card";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import type { NumberedVersion } from "@/lib/catalog/audio-versions";
import type { DossierRow } from "@/lib/catalog/master/dossier";
import type { MasterRights } from "@/lib/catalog/master/rules";
import type { TitleNextAction } from "@/lib/catalog/master/title-status";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { lowerFirst } from "@/lib/ui/journey";
import { myValidationTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

import { DossierAction } from "./dossier-action";
import { dossierTarget, dossierVerb } from "./dossier-targets";

const fr = { catalog, masterPage };

const secondary =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";

type Lead = {
  title: string;
  why: string;
  then: string;
  place: string;
  validate: boolean;
  // The gesture: a tab of the title, or a piece of the dossier on the spot.
  href: string | null;
  row: DossierRow | null;
};

/** The next action in words: what, why, where and what follows. */
function leadOf(
  next: TitleNextAction,
  masterId: string,
  rows: DossierRow[],
): Lead | null {
  const t = fr.masterPage.overview;
  const audio = fr.masterPage.tabs.audio;
  const label = (v: NumberedVersion) => versionLabel(v);
  const base = { validate: false, row: null };
  switch (next.kind) {
    case "add_first_version":
      return {
        ...base,
        title: t.nextActions.add_first_version,
        why: t.now.why.add_first_version,
        then: t.now.thenOf.first,
        place: audio,
        href: routes.masterAudio(masterId),
      };
    case "review":
    case "awaiting_review":
      return {
        ...base,
        title:
          next.kind === "review"
            ? t.nextActions.review(label(next.version))
            : t.nextActions.awaiting_review(label(next.version)),
        why: t.now.why.review(label(next.version)),
        then: t.now.thenOf.review,
        place: audio,
        validate: next.kind === "review",
        href: routes.masterAudio(masterId),
      };
    case "deposit_correction":
      return {
        ...base,
        title: t.nextActions.deposit_correction(label(next.version)),
        why: t.now.why.deposit_correction(label(next.version)),
        then: fr.catalog.audioStates[next.version.audioState],
        place: audio,
        href: routes.masterAudio(masterId),
      };
    case "deposit_next": {
      const state = fr.catalog.audioStates[next.state];
      return {
        ...base,
        title: t.nextActions.deposit_next(state),
        why: t.now.why.deposit_next(lowerFirst(state)),
        then: state,
        place: audio,
        href: routes.masterAudio(masterId),
      };
    }
    case "link_project":
      return {
        ...base,
        title: t.nextActions.link_project,
        why: t.now.why.link_project,
        then: t.now.thenOf.project,
        place: fr.masterPage.tabs.projects,
        href: routes.masterProjects(masterId),
      };
    case "complete": {
      const row = rows.find((r) => r.key === next.key);
      if (!row) return null;
      const missing = rows.filter((r) => !r.done && !r.locked).length;
      return {
        ...base,
        title: dossierVerb(row),
        why: row.group === "release" ? t.now.why.release : t.now.why.later,
        then: t.now.thenOf.others(missing - 1),
        place: t.dossier.title,
        href: null,
        row,
      };
    }
    case "none":
      return null;
  }
}

/**
 * « Maintenant » of a title (proto `docs/protos/titre.html`): the same frame
 * as the home and Travail (NowFrame). The next action computed by code
 * (titleNextAction), why, what follows, and « Ouvrir » on the gesture — a
 * piece of the dossier opens its dialog on the spot. A reader sees who is
 * awaited; a complete title says so.
 */
export function TitleNow({
  masterId,
  title,
  next,
  rows,
  rights,
  canEdit,
}: {
  masterId: string;
  title: string;
  next: TitleNextAction;
  rows: DossierRow[];
  rights: MasterRights;
  canEdit: boolean;
}) {
  const t = fr.masterPage.overview.now;
  const lead = leadOf(next, masterId, rows);
  if (!lead)
    return (
      <NowFrame label={t.label}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="neutral">{t.nothing}</StatusBadge>
        </div>
        <h2 className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance">
          {t.doneTitle}
        </h2>
        <p className={cn(secondary, "text-pretty")}>{t.doneBody}</p>
      </NowFrame>
    );

  const mine = canEdit && next.kind !== "awaiting_review";
  const target = lead.row ? dossierTarget(lead.row, masterId, rights) : null;
  return (
    <NowFrame label={t.label}>
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        <StatusBadge tone={mine ? "info" : "neutral"}>
          {mine ? t.mine : t.nothing}
        </StatusBadge>
        {mine && lead.validate && (
          <StatusBadge tone={myValidationTone} size="sm">
            {t.toValidate}
          </StatusBadge>
        )}
        <span>{t.where(title, lead.place)}</span>
      </div>
      <h2 className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance">
        {mine || next.kind === "awaiting_review"
          ? lead.title
          : t.waiting(lowerFirst(lead.title))}
      </h2>
      <p className={cn(secondary, "text-pretty")}>{lead.why}</p>
      {mine && (
        <>
          <dl className={cn(secondary, "flex gap-1.5")}>
            <dt>{t.then} :</dt>
            <dd className="font-semibold text-[color:var(--text-primary)]">
              {lead.then}
            </dd>
          </dl>
          <div>
            {target ? (
              <DossierAction
                masterId={masterId}
                target={target}
                label={t.open}
                variant="default"
                size="default"
              />
            ) : (
              lead.href && (
                <ViewLink href={lead.href} className={buttonVariants()}>
                  <ButtonRoll>{t.open}</ButtonRoll>
                </ViewLink>
              )
            )}
          </div>
        </>
      )}
    </NowFrame>
  );
}
