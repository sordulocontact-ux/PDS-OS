"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";

import { ContactForm } from "@/components/network/contact-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import type { CreditContactAction } from "@/lib/facts/credit-contact";
import { fr } from "@/lib/i18n/fr";
import { loadContactOptions } from "@/lib/network/actions";

/**
 * "Ajouter au Réseau" from a workflow page (Juridique, Master): the usual
 * contact form, filled with the credited name and the role it suggests.
 * Saved, every unlinked credit of that name is linked to the new contact (by
 * the server, lib/network/link-credits.ts) and the page refreshes: the row reads "Dans le Réseau". The user stays on
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
      // Its reach said before saving: every unlinked credit of that name, on
      // every title, is linked by the server.
      description={
        action.links.length > 0
          ? `${t.createDescription} ${fr.facts.linkMany(action.links.length, action.name)}`
          : t.createDescription
      }
      closeLabel={t.close}
      load={loadContactOptions}
    >
      {(options, close) => (
        <ContactForm
          options={options}
          initial={{
            name: action.name,
            roles: action.roles,
            ...(action.artistId ? { artistId: action.artistId } : {}),
          }}
          stay
          onCancel={close}
          // The server links the credits of that name to the new contact.
          onSaved={() => {
            close();
            router.refresh();
          }}
        />
      )}
    </LoadedFormButton>
  );
}
