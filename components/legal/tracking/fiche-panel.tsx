"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { ComplementRequest } from "@/components/legal/forms/complement-request";
import { FicheLinkCard } from "@/components/legal/forms/fiche-link-card";
import { FicheAnswers } from "@/components/legal/tracking/fiche-answers";
import { FicheSend } from "@/components/legal/tracking/fiche-send";
import {
  usePlanSheet,
  type PreparedLink,
} from "@/components/legal/tracking/plan-sheet-context";
import { AddToNetworkButton } from "@/components/network/add-to-network-button";
import { StepSection } from "@/components/shell/journey/step-section";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { masterPage } from "@/lib/i18n/fr/master-page";
import {
  prepareLegalForm,
  requestLegalFormComplement,
  reviewLegalForm,
  setLegalFormState,
} from "@/lib/legal/forms/actions";
import { ficheMissing } from "@/lib/legal/forms/completeness";
import type { FormRow } from "@/lib/legal/forms/queries";
import { ficheBadge, missingLabels } from "@/lib/legal/forms/state";
import { formatInstant } from "@/lib/utils/instant";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { legal, legalForms, masterPage };

const muted =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";

/**
 * One person's fiche in their démarche, as the Master sends its package
 * (Sacha, 06/11/2026: « pas pro »; proto juridique-v3 `link`): what the
 * fiche already knows, then the e-mail PDS OS will send (`MailCard`) or,
 * without an address, the link to create; the private link kept visible
 * (`PrivateLinkCard`) while it waits; what the person filled in as fact
 * rows with their source, the corrections to check and the decision.
 */
export function FichePanel({
  projectId,
  projectTitle = "",
  row,
}: {
  projectId: string;
  // The e-mail's subject.
  projectTitle?: string;
  row: FormRow;
}) {
  const t = fr.legalForms.page;
  const p = fr.legal.panels.fiche;
  // Kept by the plan, not here: the panel may remount after the refresh.
  const sheet = usePlanSheet();
  const link = sheet.links[row.key] ?? null;
  const setLink = (next: PreparedLink | null) => sheet.setLink(row.key, next);
  // Just prepared, or kept sealed by the server (rule 19).
  const url = link?.url ?? row.link?.url ?? null;
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>(t.emailed.body);
  const publish = usePublishResult();

  const act = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error ?? t.failed);
    });
  // A gesture that says what follows (JUR-04, JUR-06): the step's banner.
  const decide = (action: () => Promise<WriteResult>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      publish(result);
    });
  // `send`: PDS OS e-mails it with the message; else only the link.
  const prepare = (send: boolean) =>
    startTransition(async () => {
      const result = await prepareLegalForm(projectId, row.key, {
        send,
        message,
      });
      if (!result.ok) return void toast.error(result.error);
      if (result.emailed === "sent")
        return void toast.success(t.emailed.sent(row.name));
      if (result.emailed === "failed") toast.warning(t.emailed.failed);
      setLink(result);
    });
  const markSent = () =>
    act(async () => {
      if (!row.formId) return { ok: false };
      const result = await setLegalFormState(projectId, row.formId, "sent");
      if (result.ok) setLink(null);
      return result;
    });

  // A featured artist not in the Réseau yet: added there, linked to the
  // artist page, before any fiche.
  if (row.artistId)
    return (
      <div className="flex flex-col items-start gap-3">
        <p className={muted}>{t.notInNetwork(row.name)}</p>
        <AddToNetworkButton
          label={fr.legal.board.verbs.addToNetwork}
          action={{
            kind: "add_to_network",
            name: row.name,
            roles: ["artist"],
            links: [],
            artistId: row.artistId,
          }}
        />
      </div>
    );

  if (row.namesakeId)
    return (
      <ToneCallout tone="warning">
        {t.namesake}{" "}
        <Link
          href={routes.projectLegalStep(projectId, "inventory")}
          className="underline underline-offset-4"
        >
          {t.linkFirst}
        </Link>
      </ToneCallout>
    );

  // A link to send by hand: just created, or created and not marked sent.
  if (url && (link || row.state === "link_generated"))
    return (
      <div className="flex flex-col gap-3">
        <p className={muted}>{p.sendYourself(row.name)}</p>
        <FicheLinkCard
          projectId={projectId}
          projectTitle={projectTitle}
          row={row}
          url={url}
          pending={pending}
          onRenew={() => prepare(false)}
          onMarkSent={markSent}
        />
      </div>
    );

  if (
    row.state === "none" ||
    row.state === "expired" ||
    row.state === "revoked" ||
    row.state === "link_generated"
  )
    return (
      <div className="flex flex-col gap-3.5">
        <StepSection title={p.known}>
          <KnownRows row={row} />
        </StepSection>
        {row.revokedReason && (
          <ToneCallout tone="warning">
            {t.revokedWhy(row.revokedReason)}
          </ToneCallout>
        )}
        <FicheSend
          row={row}
          projectTitle={projectTitle}
          message={message}
          onMessage={setMessage}
          pending={pending}
          onSend={() => prepare(true)}
          onLinkOnly={() => prepare(false)}
        />
      </div>
    );

  const linkCard = (
    <FicheLinkCard
      projectId={projectId}
      projectTitle={projectTitle}
      row={row}
      pending={pending}
      onRenew={() => prepare(false)}
    />
  );

  if (row.state === "sent")
    return (
      <div className="flex flex-col gap-3">
        <p className={muted}>
          {p.sent(row.since ? formatInstant(row.since) : "")}
        </p>
        {linkCard}
      </div>
    );

  // A complement asked: the person answers on their link (JUR-06).
  if (row.state === "action_required" && row.complement)
    return (
      <div className="flex flex-col gap-3.5">
        <p className={muted}>
          {t.complementWaiting(
            formatInstant(row.complement.at),
            missingLabels(row.complement.fields),
          )}
        </p>
        {linkCard}
        <FicheAnswers row={row} />
      </div>
    );

  // Received, to check (JUR-06): incomplete, it is asked again; complete,
  // validated (its corrections accepted or not).
  if (row.state === "action_required" && row.submission) {
    const missing = ficheMissing(row.submission);
    const corrections = Object.entries(row.submission.corrections);
    const badge = ficheBadge(row);
    const validate = (accept: boolean) =>
      decide(() => reviewLegalForm(projectId, row.formId!, accept));
    return (
      <div className="flex flex-col gap-3.5">
        {corrections.length > 0 && (
          <StepSection title={p.corrections}>
            <FactRows>
              {corrections.map(([id, c]) => (
                <FactRow
                  key={id}
                  label={fr.legalForms.fields[id] ?? id}
                  value={t.correction(c.before, c.after)}
                  source={p.fromFiche(row.name)}
                />
              ))}
            </FactRows>
          </StepSection>
        )}
        <FicheAnswers
          row={row}
          aside={
            <StatusBadge tone={badge.tone} size="sm">
              {badge.label}
            </StatusBadge>
          }
        />
        {missing.length > 0 ? (
          <ComplementRequest
            key={missing.join(",")}
            name={row.name}
            missing={missing}
            pending={pending}
            emailed={row.canEmail}
            onAsk={(note) =>
              decide(() =>
                requestLegalFormComplement(projectId, row.formId!, note),
              )
            }
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => validate(true)}>
              {corrections.length > 0 ? t.validateCorrections : t.validate}
            </Button>
            {corrections.length > 0 && (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => validate(false)}
              >
                {t.keepOld}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ToneCallout tone="success">
        <span className="font-medium">{p.complete}</span> — {p.completeBody}
      </ToneCallout>
      <FicheAnswers row={row} />
    </div>
  );
}

/** What the fiche already knows of the person, each with its source:
 * they confirm it rather than type it (rule 20). */
function KnownRows({ row }: { row: FormRow }) {
  const p = fr.legal.panels.fiche;
  const roles = row.creditRoles
    .map((role) => fr.masterPage.credits.roles[role])
    .join(", ");
  return (
    <FactRows>
      {roles && (
        <FactRow label={p.roles} value={roles} source={p.fromCredits} />
      )}
      {row.performer ? (
        <FactRow
          label={p.artistName}
          value={row.performer.name}
          source={p.fromArtist}
        />
      ) : (
        <FactRow label={p.creditName} value={row.name} source={p.fromCredits} />
      )}
      {row.email && (
        <FactRow
          label={fr.legalForms.fields.email}
          value={row.email}
          source={p.fromNetwork}
        />
      )}
    </FactRows>
  );
}
