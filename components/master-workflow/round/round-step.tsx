import { IconLock } from "nucleo-sharp-essential";

import { EngineerThreadSection } from "@/components/master-workflow/engineer-thread-section";
import { PackagePreview } from "@/components/master-workflow/package-preview";
import { BlockerCallout } from "@/components/ui/blocker-callout";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { invoices } from "@/lib/i18n/fr/invoices";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import { masterInHouse } from "@/lib/i18n/fr/master-inhouse";
import { masterRound } from "@/lib/i18n/fr/master-round";
import type { RoundStepView } from "@/lib/master-workflow/round-step";
import { formatDay, formatShortDay, formatShortInstant } from "@/lib/utils/day";

import { LinkPanel } from "./link-panel";
import { AssignRound } from "./assign-round";
import { InHouseDeposit } from "./inhouse-deposit";
import { RateBlock } from "./rate-block";
import { RoundVersions } from "./round-versions";
import { SendForm } from "./send-form";

const fr = { invoices, masterRound, masterInHouse, masterWorkflow };

const t = fr.masterRound;

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
  const { blockers } = round;
  const lead = (leadIds?.size ?? 0) > 0;
  // PDS OS sends the e-mail itself: configured, and an address to write to.
  const mailed = round.emailEnabled && Boolean(view.engineer?.email);
  const rest = (
    <>
      {sent && (
        <>
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
        <>
          <BlockerCallout
            blockers={blockers}
            title={fr.masterWorkflow.mix.blockers.title}
          />
          <PackagePreview view={view} />
          <ToneCallout
            tone="info"
            icon={<IconLock aria-hidden className="size-4" />}
          >
            {t.dossier.internal}
            {view.reusesMixLink && engineer ? t.dossier.sameLink(engineer) : ""}
          </ToneCallout>
        </>
      )}

      {sent && round.briefChangedSinceSent && (
        <VersionCard
          title={t.package.title[stage]}
          meta={formatShortInstant(link!.createdAt)}
        >
          <PackagePreview view={view} />
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
                done={
                  sent
                    ? t.send.resent
                    : mailed
                      ? t.email.sent(view.engineer.name)
                      : t.send.done(view.engineer.name)
                }
                withoutStems={stage === "mix" && noStems.length > 0}
                mail={
                  sent
                    ? null
                    : {
                        sends: mailed,
                        title: mailed
                          ? t.email.sendTitle
                          : t.email.declaredTitle,
                        line: mailed
                          ? t.email.sendLine(round.senderName)
                          : t.email.declaredLine,
                        to: view.engineer.email
                          ? `${view.engineer.name} <${view.engineer.email}>`
                          : `${view.engineer.name} · ${t.email.noEmail}`,
                        subject: t.email.subjectValue(projectTitle, stage),
                        defaultMessage: t.email.defaultMessage(
                          view.engineer.name,
                          projectTitle,
                          stage,
                        ),
                        added: view.reusesMixLink
                          ? t.email.addedSame
                          : t.email.added,
                        open: view.reusesMixLink
                          ? t.email.openSame
                          : t.email.openNew,
                        validity: t.email.linkValidity(
                          formatDay(round.linkUntil),
                        ),
                      }
                }
              />
            )}
          </>
        )}

      {link && (
        <LinkPanel
          projectId={view.projectId}
          stage={stage}
          engineer={link.contactName}
          contactId={view.engineer?.id ?? null}
          email={view.engineer?.email ?? null}
          title={projectTitle}
          transmission={{
            id: link.id,
            continued: link.continued,
            linkSentAt: link.linkSentAt,
            openedAt: link.openedAt,
            revokedAt: link.revokedAt,
            revokeReason: link.revokeReason,
            expiresAt: link.expiresAt,
            daysLeft: link.daysLeft,
          }}
          page={round.page}
          canEdit={viewerIsOwner}
          canSeeLink={viewerIsOwner || round.isDirection}
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
