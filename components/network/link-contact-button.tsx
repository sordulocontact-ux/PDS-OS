"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { linkContributorContact } from "@/lib/catalog/master/contact-link-actions";
import type { CreditContactAction } from "@/lib/facts/credit-contact";
import { facts } from "@/lib/i18n/fr/facts";

const fr = { facts };

/** "Relier" a credit to the contact of the Réseau that bears its name, with
 * the other unlinked credits of that name in the project: a human decision,
 * never automatic (a namesake is not proof), its reach said in the title. */
export function LinkContactButton({
  action,
}: {
  action: Extract<CreditContactAction, { kind: "link_contact" }>;
}) {
  const t = fr.facts;
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="xs"
      className="relative z-10"
      title={t.linkTitle(action.contactName, action.links.length)}
      aria-label={t.linkTitle(action.contactName, action.links.length)}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          const result = await linkContributorContact({
            contactId: action.contactId,
            links: action.links,
          });
          if (!result.ok) toast.error(result.error);
        })
      }
    >
      {t.link}
    </Button>
  );
}
