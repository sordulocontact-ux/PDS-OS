"use client";

import Link from "next/link";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { masterFileRequests } from "@/lib/i18n/fr/master-file-requests";
import { cancelMasterFileRequest } from "@/lib/master-workflow/file-request-actions";

import { FileRequestDeposit } from "./file-request-deposit";

const fr = { dialogs, masterFileRequests };
const t = fr.masterFileRequests;

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});
const day = (iso: string) => dayFormat.format(new Date(iso));

/** An open line of « Demander des fichiers », as the Source step shows it. */
export type FileRequestLine = {
  id: string;
  // The title's name in the project, and its page in the Master.
  title: string;
  href: string;
  personName: string;
  requestedByName: string;
  note: string | null;
  createdAt: string;
};

/**
 * The active title's open request, on the Source step (lot 9 bis): to whom,
 * since when, the message; « Annuler la demande » for its author or the
 * owner.
 */
export function FileRequestNotice({
  projectId,
  line,
  canCancel,
}: {
  projectId: string;
  line: FileRequestLine;
  canCancel: boolean;
}) {
  const { pending, error, run } = useWriteSubmit(undefined, t.cancelled);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm font-medium">
          {t.askedOf(line.personName, day(line.createdAt))}
        </p>
        {canCancel && (
          <Button
            size="sm"
            variant="ghost"
            className="-mr-2.5"
            disabled={pending}
            aria-busy={pending || undefined}
            aria-label={t.cancelLabel(line.title)}
            onClick={() =>
              run(() => cancelMasterFileRequest(projectId, line.id))
            }
          >
            {t.cancel}
          </Button>
        )}
      </div>
      {line.note && (
        <p className="text-sm break-words text-[color:var(--text-secondary)]">
          « {line.note} »
        </p>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}

/**
 * The files asked of the viewer, every title together, at the head of the
 * Source step (lot 9 bis): one line per title, « Déposer le fichier » opens
 * its deposit; each file arrives on its own title only.
 */
export function MyFileRequests({
  projectId,
  lines,
}: {
  projectId: string;
  lines: FileRequestLine[];
}) {
  return (
    <section aria-labelledby="my-file-requests" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="my-file-requests" className="text-body-lg font-medium">
          {t.mine}
        </h2>
        <p className="text-sm text-[color:var(--text-secondary)]">
          {t.mineHint}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line.id}>
            <MyFileRequest projectId={projectId} line={line} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MyFileRequest({
  projectId,
  line,
}: {
  projectId: string;
  line: FileRequestLine;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={line.href}
          className="text-sm font-medium break-words hover:underline"
        >
          {line.title}
        </Link>
        <p className="text-caption text-[color:var(--text-secondary)]">
          {t.askedBy(line.requestedByName, day(line.createdAt))}
        </p>
        {line.note && (
          <p className="text-sm break-words text-[color:var(--text-secondary)]">
            « {line.note} »
          </p>
        )}
      </div>
      <Button
        size="sm"
        className="self-start sm:self-center"
        aria-label={t.depositLabel(line.title)}
        onClick={() => setOpen(true)}
      >
        {t.deposit}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.depositTitle(line.title)}
        description={t.depositDescription}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <FileRequestDeposit
            projectId={projectId}
            requestId={line.id}
            title={line.title}
            onDone={() => setOpen(false)}
          />
        )}
      </FormDialog>
    </div>
  );
}
