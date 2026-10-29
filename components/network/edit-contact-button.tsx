"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { ContactForm } from "@/components/network/contact-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { records } from "@/lib/i18n/fr/records";
import { loadContactEdit } from "@/lib/network/actions";

const fr = { records };

/** « Modifier » of a contact's page: its real form, read when it opens. */
export function EditContactButton({ contactId }: { contactId: string }) {
  const t = fr.records.edit;
  return (
    <LoadedFormButton
      label={fr.records.menu.edit}
      icon={IconPenWriting2}
      variant="outline"
      title={t.title.contact}
      description={t.description.contact}
      closeLabel={t.close}
      load={() => loadContactEdit(contactId)}
    >
      {(data, close) =>
        data ? (
          <ContactForm
            contact={data.contact}
            options={data.options}
            onCancel={close}
            onSaved={() => {
              close();
              toast.success(t.saved);
            }}
          />
        ) : (
          <FormMessage kind="error">{fr.records.errors.not_found}</FormMessage>
        )
      }
    </LoadedFormButton>
  );
}
