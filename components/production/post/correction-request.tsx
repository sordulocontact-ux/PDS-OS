"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { holderValue } from "@/components/production/holder-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionCorrections } from "@/lib/i18n/fr/production-corrections";
import { productionPost } from "@/lib/i18n/fr/production-post";
import {
  sendCorrections,
  updateCorrections,
} from "@/lib/production/post/correction-actions";
import {
  requestComments,
  requestText,
} from "@/lib/production/post/corrections";
import type {
  CorrectionRequest,
  PostPeople,
  PostVersion,
  ProviderLinkState,
} from "@/lib/production/post/types";
import { formatDate, formatDateTime } from "@/lib/release/format";
import { correctionRequestTone } from "@/lib/ui/state-tones";

import { CorrectionFields, type CorrectionMissing } from "./correction-fields";
import { ProviderLinkButton } from "./provider-link-button";

const fr = { productionPost, productionCorrections };

const t = fr.productionCorrections;

/**
 * The correction request of a version (PROD-031): to whom, for when, how
 * many feedbacks, its state — brouillon, transmise, consultée, traitée —
 * and, for a reviewer, « Copier et marquer transmise » / « Relancer » (the
 * same request, counted) and « Réaffecter ou changer l'échéance ».
 */
export function CorrectionRequestBlock({
  projectId,
  sheetId,
  version,
  request,
  people,
  canReview,
  canOrganize,
  link,
}: {
  projectId: string;
  sheetId: string;
  version: PostVersion;
  request: CorrectionRequest;
  people: PostPeople;
  canReview: boolean;
  canOrganize: boolean;
  // The recipient's private link, when a Réseau contact (PROD-026).
  link: ProviderLinkState | null;
}) {
  const [editing, setEditing] = useState(false);
  const send = useWriteSubmit(
    () => {},
    request.status === "draft" ? t.sentDone : t.resentDone,
  );
  const treated = request.status === "treated";
  const kept = requestComments(version, request).length;

  async function copyAndSend() {
    try {
      await navigator.clipboard.writeText(requestText(version, request));
    } catch {
      toast.error(fr.productionPost.errors.generic);
      return;
    }
    send.run(() =>
      sendCorrections({
        projectId,
        requestId: request.id,
        text: requestText(version, request),
      }),
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">{t.title}</h4>
        <StatusBadge tone={correctionRequestTone[request.status]} size="sm">
          {request.status === "treated" && request.treatedVersionNumber
            ? t.treatedBy(request.treatedVersionNumber)
            : t.statuses[request.status]}
        </StatusBadge>
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{t.to(request.recipient.name)}</span>
        <span className="tabular-nums">
          {t.dueOn(formatDate(request.dueOn))}
        </span>
        <span className="text-muted-foreground">{t.count(kept)}</span>
      </p>
      {request.sentBy && request.sentAt && (
        <p className="text-sm text-muted-foreground">
          {t.sentOn(request.sentBy, formatDateTime(request.sentAt))}
          {request.reminders > 0 && ` · ${t.reminders(request.reminders)}`}
        </p>
      )}
      {request.message && (
        <p className="text-sm break-words whitespace-pre-line">
          {request.message}
        </p>
      )}
      {canReview && !treated && (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={request.status === "draft" ? "default" : "outline"}
              disabled={send.pending}
              aria-busy={send.pending || undefined}
              onClick={copyAndSend}
            >
              {request.status === "draft" ? t.send : t.resend}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              {t.edit}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {request.recipient.kind === "contact"
              ? t.copyHintProvider
              : t.copyHint}
          </p>
          {canOrganize && request.recipient.kind === "contact" && (
            <ProviderLinkButton
              projectId={projectId}
              sheetId={sheetId}
              holder={request.recipient}
              link={link}
            />
          )}
          <FormMessage kind="error">{send.error}</FormMessage>
        </div>
      )}
      {canReview && !treated && (
        <EditRequestDialog
          projectId={projectId}
          request={request}
          people={people}
          open={editing}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}

function EditRequestDialog({
  projectId,
  request,
  people,
  open,
  onClose,
}: {
  projectId: string;
  request: CorrectionRequest;
  people: PostPeople;
  open: boolean;
  onClose: () => void;
}) {
  const [recipient, setRecipient] = useState(holderValue(request.recipient));
  const [missing, setMissing] = useState(new Set<CorrectionMissing>());
  const { pending, error, run } = useWriteSubmit(onClose, t.editDone);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const dueOn = String(data.get("dueOn") ?? "");
    const lack = new Set<CorrectionMissing>();
    if (!recipient) lack.add("recipient");
    if (!dueOn) lack.add("due");
    setMissing(lack);
    if (lack.size > 0) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    run(() =>
      updateCorrections({
        projectId,
        requestId: request.id,
        recipient,
        dueOn,
        message: String(data.get("message") ?? ""),
      }),
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t.editTitle}
      description={t.editDescription}
      closeLabel={fr.productionPost.close}
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
      >
        <CorrectionFields
          idPrefix={`edit-${request.id}`}
          people={people}
          recipient={recipient}
          onRecipient={setRecipient}
          dueOn={request.dueOn}
          message={request.message}
          missing={missing}
        />
        {missing.size > 0 && (
          <FormMessage kind="error">{t.missingCount(missing.size)}</FormMessage>
        )}
        <FormMessage kind="error">{error}</FormMessage>
        <DialogFormActions
          pending={pending}
          submitLabel={fr.productionPost.save}
          onCancel={onClose}
        />
      </form>
    </FormDialog>
  );
}
