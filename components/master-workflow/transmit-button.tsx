"use client";

import { IconPaperPlane2 } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { useShowLinks } from "@/components/ui/one-time-links";
import { fr } from "@/lib/i18n/fr";
import type { PackageRole } from "@/lib/master-workflow/transmission";
import { transmitPackage } from "@/lib/master-workflow/transmission-actions";

export type TransmitMode = "first" | "remind" | "resend";

/**
 * "Transmettre au mixeur", "Relancer" (no answer yet) or "Renvoyer le
 * dossier" (received, but the package changed or its link expired): a note,
 * then the private link, shown once (only its hash is stored): copy it, or
 * open an e-mail to the engineer with it (`useShowLinks`). The follow-up
 * refreshes when the modal closes.
 */
export function TransmitButton({
  projectId,
  projectTitle,
  engineerEmail,
  mode,
  role,
}: {
  projectId: string;
  projectTitle: string;
  engineerEmail: string | null;
  // After the first sending, a new link always replaces the previous one.
  mode: TransmitMode;
  role: PackageRole;
}) {
  const t = fr.masterWorkflow.mix;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) router.refresh();
  };
  return (
    <>
      <Button
        variant={mode === "first" ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        <IconPaperPlane2 aria-hidden data-icon="inline-start" />
        {mode === "first" ? t.transmitTo[role] : t.modes[mode].label}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={close}
        title={mode === "first" ? t.transmitTitle : t.modes[mode].title}
        description={
          mode === "first" ? t.transmitDescription : t.modes[mode].description
        }
        closeLabel={t.close}
      >
        <TransmitForm
          projectId={projectId}
          projectTitle={projectTitle}
          engineerEmail={engineerEmail}
          role={role}
          onClose={() => close(false)}
        />
      </FormDialog>
    </>
  );
}

function TransmitForm({
  projectId,
  projectTitle,
  engineerEmail,
  role,
  onClose,
}: {
  projectId: string;
  projectTitle: string;
  engineerEmail: string | null;
  role: PackageRole;
  onClose: () => void;
}) {
  const t = fr.masterWorkflow.mix;
  const showLinks = useShowLinks();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await transmitPackage(projectId, role, note);
      if (!result.ok) return setError(result.error);
      // The page refreshes and this button may move ("Relancer"): the link
      // is shown by the dialog above the page, which survives it.
      const link = `${window.location.origin}/m/${result.token}`;
      onClose();
      showLinks({
        title: t.linkTitle,
        description: t.sent,
        links: [
          {
            key: result.token,
            label: t.link,
            url: link,
            email: engineerEmail
              ? {
                  href: `mailto:${engineerEmail}?subject=${encodeURIComponent(t.emailSubject[role](projectTitle))}&body=${encodeURIComponent(t.emailBody(link))}`,
                  label: t.email,
                }
              : undefined,
          },
        ],
        copyLabel: t.copy,
        copiedLabel: t.copied,
        closeLabel: t.close,
      });
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <TextareaField
        name="note"
        label={t.note}
        hint={t.noteHint}
        rows={3}
        maxLength={2000}
        disabled={pending}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onClose}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
