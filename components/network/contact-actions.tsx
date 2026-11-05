"use client";

import { toast } from "@/components/ui/toast";

import { EditPanel } from "@/components/archive/edit-panel";
import { RecordActions } from "@/components/archive/record-actions";
import { ContactForm } from "@/components/network/contact-form";
import type { RecordRights } from "@/lib/archive/types";
import { records } from "@/lib/i18n/fr/records";
import { loadContactEdit } from "@/lib/network/actions";

const fr = { records };

/** "⋯" of a network contact: edit it, archive, restore or delete it (director). */
export function ContactActions({
  contact,
  rights,
  leaveTo,
  size,
  reveal,
}: {
  contact: { id: string; name: string };
  rights: RecordRights;
  leaveTo?: string;
  size?: "icon-sm" | "icon-lg";
  reveal?: boolean;
}) {
  return (
    <RecordActions
      kind="contact"
      id={contact.id}
      name={contact.name}
      rights={rights}
      leaveTo={leaveTo}
      size={size}
      reveal={reveal}
      edit={(close) => (
        <EditPanel load={() => loadContactEdit(contact.id)}>
          {({ contact: values, options }) => (
            <ContactForm
              contact={values}
              options={options}
              onCancel={close}
              onSaved={() => {
                close();
                toast.success(fr.records.edit.saved);
              }}
            />
          )}
        </EditPanel>
      )}
    />
  );
}
