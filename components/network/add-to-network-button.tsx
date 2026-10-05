"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ContactForm } from "@/components/network/contact-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { linkContributorContact } from "@/lib/catalog/master/contact-link-actions";
import type { CreditContactAction } from "@/lib/facts/credit-contact";
import { fr } from "@/lib/i18n/fr";
import { loadContactOptions } from "@/lib/network/actions";

/**
 * "Ajouter au Réseau" from a workflow page (Juridique, Master): the usual
 * contact form, filled with the credited name and the role it suggests.
 * Saved, every unlinked credit of that name in the project is linked to the
 * new contact
 * and the page refreshes: the row reads "Dans le Réseau". The user stays on
 * the page. `header`: the add button of a section's header (Ingénieurs du
 * Réseau), instead of a row's.
 */
export function AddToNetworkButton({
  action,
  label = fr.facts.addToNetwork,
  header = false,
}: {
  action: Extract<CreditContactAction, { kind: "add_to_network" }>;
  label?: string;
  header?: boolean;
}) {
  const router = useRouter();
  const t = fr.network.form;
  return (
    <LoadedFormButton
      label={label}
      icon={header ? IconPlus : undefined}
      variant="outline"
      size={header ? "sm" : "xs"}
      // A row's button sits above the row's stretched link.
      className={header ? undefined : "relative z-10"}
      title={t.createTitle}
      // Its reach said before saving: every credit of that name is linked.
      description={
        action.links.length > 1
          ? `${t.createDescription} ${fr.facts.linkMany(action.links.length, action.name)}`
          : t.createDescription
      }
      closeLabel={t.close}
      load={loadContactOptions}
    >
      {(options, close) => (
        <ContactForm
          options={options}
          initial={{ name: action.name, roles: action.roles }}
          stay
          onCancel={close}
          onSaved={async (contactId) => {
            close();
            // A credit is linked to the contact just created: the link, not
            // the name, is what the workflows trust.
            if (action.links.length > 0) {
              const result = await linkContributorContact({
                contactId,
                links: action.links,
              });
              if (!result.ok) toast.error(result.error);
            }
            router.refresh();
          }}
        />
      )}
    </LoadedFormButton>
  );
}
