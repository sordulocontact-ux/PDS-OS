"use client";

import { IconPaperPlane2 } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import type { PackageRole } from "@/lib/master-workflow/transmission";
import { transmitPackage } from "@/lib/master-workflow/transmission-actions";

/**
 * "Transmettre au mixeur" / "Relancer": a note, then the private link,
 * shown once (only its hash is stored): copy it, or open an e-mail to the
 * engineer with it. The follow-up refreshes when the modal closes.
 */
export function TransmitButton({
  projectId,
  projectTitle,
  engineerEmail,
  remind,
  role,
}: {
  projectId: string;
  projectTitle: string;
  engineerEmail: string | null;
  // A reminder: a new link replaces the previous one.
  remind: boolean;
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
        variant={remind ? "outline" : "default"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        <IconPaperPlane2 aria-hidden data-icon="inline-start" />
        {remind ? t.remind : t.transmitTo[role]}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={close}
        title={remind ? t.remindTitle : t.transmitTitle}
        description={remind ? t.remindDescription : t.transmitDescription}
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
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await transmitPackage(projectId, role, note);
      if (result.ok) setLink(`${window.location.origin}/m/${result.token}`);
      else setError(result.error);
    });
  }

  if (link) {
    const mailto = engineerEmail
      ? `mailto:${engineerEmail}?subject=${encodeURIComponent(t.emailSubject[role](projectTitle))}&body=${encodeURIComponent(t.emailBody(link))}`
      : null;
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm">{t.sent}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="package-link">{t.link}</Label>
          <Input
            id="package-link"
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            className="h-10"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>
            {t.close}
          </Button>
          {mailto && (
            <Button
              variant="outline"
              size="lg"
              render={<a href={mailto} />}
              nativeButton={false}
            >
              {t.email}
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            onClick={() =>
              navigator.clipboard
                .writeText(link)
                .then(() => toast.success(t.copied))
            }
          >
            {t.copy}
          </Button>
        </div>
      </div>
    );
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
