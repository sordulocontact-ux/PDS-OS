import { EngineerThreadSection } from "@/components/master-workflow/engineer-thread-section";
import { ListenLinkOffer } from "@/components/master-workflow/listen/listen-link-offer";
import { PackagePreview } from "@/components/master-workflow/package-preview";
import { ContactLinkOffer } from "@/components/portal/contact-links-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { fr } from "@/lib/i18n/fr";
import type { RoundStepView } from "@/lib/master-workflow/round-step";
import { masterStepHref } from "@/lib/ui/master-steps";
import { formatDay, formatShortDay, formatShortInstant } from "@/lib/utils/day";

import { LinkPanel } from "./link-panel";
import { AssignRound } from "./assign-round";
import { InHouseDeposit } from "./inhouse-deposit";
import { RateBlock } from "./rate-block";
import { RoundVersions } from "./round-versions";
import { SendForm } from "./send-form";

const t = fr.masterRound;
const h3 =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/**
 * The Mixage or the Mastering step (proto `master-v2.html`): before the
 * sending, what is ready, the package exactly as the engineer will get it,
 * the e-mail to write and « Envoyer à … »; once sent, the versions with
 * their feedback and decision, the rate, the private link and the thread
 * with the engineer. With a lead (the validator's decision at the head of
 * the step, RoundLead), the rest — older versions apart — folds under one
 * line (lot 4 of Ibé's feedback).
 */
export function RoundStep({
  round,
  viewerIsOwner,
  projectTitle,
  leadIds,
}: {
  round: RoundStepView;
  viewerIsOwner: boolean;
  projectTitle: string;
  leadIds?: ReadonlySet<string>;
}) {
  const { view, stage, link, inHouse } = round;
  const engineer =
    view.engineer?.name ?? link?.contactName ?? inHouse?.name ?? "";
  if (stage === "mix" && round.notNeeded.length > 0 && view.titles.length === 0)
    return (
      <div className="flex flex-col gap-3">
        {round.notNeeded.map((n) => (
          <ToneCallout key={n.title} tone="success">
            {t.notNeeded(n.file, n.by, formatShortDay(n.at), null)}
          </ToneCallout>
        ))}
      </div>
    );
  const sent = link !== null || Boolean(inHouse?.assignedAt);
  const noStems = view.titles.filter((x) => x.stems === 0).map((x) => x.title);
  const sameEngineer =
    stage === "mastering" && view.brief?.masteringSameEngineer === true;
  const blockers = [
    ...(round.vocalsAwaited
      ? [
          {
            text: t.blockers.vocals,
            href: masterStepHref(view.projectId, "source"),
          },
        ]
      : []),
    ...view.blockers,
  ];
  const lead = (leadIds?.size ?? 0) > 0;
  const rest = (
    <>
      {sent && (
        <>
          <ListenLinkOffer projectId={view.projectId} />
          {inHouse?.isViewer && inHouse.assignedAt && (
            <InHouseDeposit round={round} />
          )}
          {round.canSeeBudget && inHouse && (
            <FactRows>
              <FactRow
                label={fr.masterInHouse.inHouse}
                value={inHouse.name}
                source={fr.masterInHouse.budget}
              />
            </FactRows>
          )}
          {round.canSeeBudget && !inHouse && (
            <RateBlock
              projectId={view.projectId}
              engineer={engineer}
              rates={round.rates}
              canEdit={viewerIsOwner}
            />
          )}
        </>
      )}

      {!sent && (
        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>{t.before.title}</h3>
          <FactRows>
            <FactRow
              label={t.before.source[stage]}
              value={
                view.titles.every((x) => x.source)
                  ? view.titles.map((x) => x.source?.fileName).join(", ")
                  : null
              }
              missing={!view.titles.every((x) => x.source)}
              state={
                view.titles.length > 0 && view.titles.every((x) => x.source)
                  ? { tone: "success", label: t.before.ready }
                  : { tone: "warning", label: t.before.missing }
              }
            />
            <FactRow
              label={t.before.brief}
              value={
                round.brief === "ready"
                  ? t.before.briefReady
                  : round.brief === "dirty"
                    ? t.before.briefDirty
                    : t.before.briefNever
              }
              state={
                round.brief === "ready"
                  ? { tone: "success", label: t.before.ready }
                  : { tone: "warning", label: t.before.toRecord }
              }
            />
            {stage === "mix" && (
              <FactRow
                label={t.before.stems}
                value={
                  noStems.length
                    ? t.before.stemsNone(noStems.join(", "))
                    : t.before.stemsCount(
                        view.titles.reduce((s, x) => s + x.stems, 0),
                      )
                }
                state={
                  noStems.length
                    ? { tone: "warning", label: t.before.missing }
                    : { tone: "success", label: t.before.ready }
                }
              />
            )}
            {view.brief?.dates.mixV1Due && stage === "mix" && (
              <FactRow
                label={t.before.dates}
                value={t.before.mixV1(formatDay(view.brief.dates.mixV1Due))}
              />
            )}
            {view.brief?.dates.masteringDue && stage === "mastering" && (
              <FactRow
                label={t.before.dates}
                value={t.before.mastering(
                  formatDay(view.brief.dates.masteringDue),
                )}
              />
            )}
          </FactRows>
        </section>
      )}

      {(!sent || round.briefChangedSinceSent) && (
        <VersionCard
          title={t.package.title[stage]}
          defaultOpen={!sent}
          meta={sent ? formatShortInstant(link!.createdAt) : undefined}
        >
          {engineer && (
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {t.package.note(engineer)}
            </p>
          )}
          <PackagePreview view={{ ...view, blockers }} />
        </VersionCard>
      )}

      {inHouse && !inHouse.assignedAt && (
        <>
          <ToneCallout tone="info">
            {fr.masterInHouse.note(inHouse.name)}
          </ToneCallout>
          {viewerIsOwner && blockers.length === 0 && (
            <AssignRound
              projectId={view.projectId}
              stage={stage}
              name={inHouse.name}
            />
          )}
        </>
      )}
      {inHouse?.assignedAt && (
        <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
          {fr.masterInHouse.assignedLine(
            inHouse.name,
            formatShortDay(inHouse.assignedAt, { bare: true }),
            null,
          )}
        </p>
      )}
      {viewerIsOwner &&
        view.engineer &&
        (!sent || round.briefChangedSinceSent) && (
          <>
            {!sent && (
              <FactRows>
                <FactRow
                  label={t.email.to}
                  value={`${view.engineer.name}${view.engineer.email ? ` <${view.engineer.email}>` : ""}`}
                  source={view.engineer.email ? null : t.email.noEmail}
                />
                <FactRow
                  label={t.email.subject}
                  value={t.email.subjectValue(projectTitle, stage)}
                />
                <FactRow
                  label={t.email.message}
                  value={view.brief?.message ?? null}
                  source={t.email.link}
                />
              </FactRows>
            )}
            {!sent && (
              <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {t.email.hint}
              </p>
            )}
            {sent && round.briefChangedSinceSent && (
              <ToneCallout tone="warning">
                {t.send.briefChanged(engineer)}
              </ToneCallout>
            )}
            {blockers.length === 0 && (
              <SendForm
                projectId={view.projectId}
                stage={stage}
                engineer={view.engineer.name}
                label={
                  sent
                    ? t.send.resend
                    : sameEngineer
                      ? t.send.sameEngineer
                      : t.send.to(view.engineer.name)
                }
                done={sent ? t.send.resent : t.send.done(view.engineer.name)}
                withoutStems={stage === "mix" && noStems.length > 0}
              />
            )}
          </>
        )}

      {link && (
        <LinkPanel
          projectId={view.projectId}
          stage={stage}
          id={link.id}
          engineer={link.contactName}
          email={view.engineer?.email ?? null}
          title={projectTitle}
          path={link.path}
          continued={link.continued}
          createdAt={link.createdAt}
          linkSentAt={link.linkSentAt}
          openedAt={link.openedAt}
          acknowledgedAt={link.acknowledgedAt}
          deliveredAt={link.deliveredAt}
          revokedAt={link.revokedAt}
          revokeReason={link.revokeReason}
          expiresAt={link.expiresAt}
          daysLeft={link.daysLeft}
          canEdit={viewerIsOwner}
        />
      )}
      {link && (
        <ContactLinkOffer
          projectId={view.projectId}
          contactId={view.engineer?.id ?? null}
        />
      )}
      <EngineerThreadSection
        view={view}
        isDirection={round.isDirection}
        direction={round.direction ?? fr.invoices.team.direction}
      />
    </>
  );
  return (
    <div className="flex flex-col gap-5">
      {stage === "mastering" && round.mixReady && engineer && (
        <ToneCallout tone="success">
          <b className="font-semibold">{t.mastering.ready}</b>{" "}
          {sameEngineer
            ? t.mastering.same(engineer)
            : t.mastering.other(engineer)}
        </ToneCallout>
      )}
      {sent && (
        <RoundVersions
          round={round}
          engineer={engineer}
          viewerIsOwner={viewerIsOwner}
          leadIds={leadIds}
        />
      )}
      {lead ? <Fold summary={t.lead.more(engineer)}>{rest}</Fold> : rest}
    </div>
  );
}
