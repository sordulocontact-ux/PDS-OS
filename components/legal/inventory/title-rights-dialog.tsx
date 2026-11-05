"use client";

import { RightsForm } from "@/components/catalog/master-page/rights-form";
import { FormDialog } from "@/components/ui/form-dialog";
import type { MasterRights } from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { masterPage };

/** A title's ISWC and ℗, opened by a click on their row of the État des
 * lieux, in the title page's form, without leaving the page. */
export function TitleRightsDialog({
  masterId,
  rights,
  open,
  onOpenChange,
}: {
  masterId: string;
  rights: MasterRights;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={fr.masterPage.rights.editTitle}
      description={fr.masterPage.rights.formDescription}
      closeLabel={fr.masterPage.form.close}
    >
      <RightsForm
        masterId={masterId}
        rights={rights}
        onDone={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}
