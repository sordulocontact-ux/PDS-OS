"use client";

import { Button, ButtonRoll } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { contactLinks } from "@/lib/i18n/fr/contact-links";
import { remindContactLink } from "@/lib/portal/contact-link-actions";

const fr = { contactLinks };

/**
 * « Relancer » when PDS OS can e-mail the contact: re-sends the project link
 * with a short reminder (remindContactLink) instead of opening a mailto that
 * would lack the link.
 */
export function RemindContactButton({
  projectId,
  contactId,
  label,
  ariaLabel,
}: {
  projectId: string;
  contactId: string;
  label: string;
  ariaLabel: string;
}) {
  const remind = useWriteSubmit(undefined, fr.contactLinks.reminded);
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={ariaLabel}
        disabled={remind.pending}
        onClick={() =>
          remind.run(() => remindContactLink(projectId, contactId))
        }
      >
        <ButtonRoll>{label}</ButtonRoll>
      </Button>
      {remind.error && (
        <span className="text-[length:var(--type-caption)] text-[color:var(--tone-danger-fg)]">
          {remind.error}
        </span>
      )}
    </span>
  );
}
