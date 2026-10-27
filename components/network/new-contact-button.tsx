"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { ContactForm } from "@/components/network/contact-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { network } from "@/lib/i18n/fr/network";
import { loadContactOptions } from "@/lib/network/actions";

const fr = { network };

/** "Nouveau contact": the form in the modal; once added, its page opens
 * (redirected by the server action). */
export function NewContactButton() {
  const t = fr.network.form;
  return (
    <LoadedFormButton
      label={fr.network.new}
      icon={IconPlus}
      title={t.createTitle}
      description={t.createDescription}
      closeLabel={t.close}
      load={loadContactOptions}
    >
      {(options, close) => (
        <ContactForm
          options={options}
          onCancel={close}
          // The server action opens the new page itself.
          onSaved={close}
        />
      )}
    </LoadedFormButton>
  );
}
