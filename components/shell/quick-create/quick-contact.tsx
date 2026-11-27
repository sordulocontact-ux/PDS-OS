"use client";

import { ContactForm } from "@/components/network/contact-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { network } from "@/lib/i18n/fr/network";
import { records } from "@/lib/i18n/fr/records";
import { loadContactOptions } from "@/lib/network/actions";

const fr = { network, records };

/** « Nouveau contact »: the Réseau's form; once added, the server action
 * opens the new page. */
export default function QuickContact({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = fr.network.form;
  return (
    <FormDialog
      size="medium"
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t.createTitle}
      description={t.createDescription}
      closeLabel={t.close}
    >
      <Loaded
        load={loadContactOptions}
        loadingLabel={fr.records.edit.loading}
        errorLabel={fr.records.edit.loadFailed}
      >
        {(options) => (
          <ContactForm options={options} onCancel={onClose} onSaved={onClose} />
        )}
      </Loaded>
    </FormDialog>
  );
}
