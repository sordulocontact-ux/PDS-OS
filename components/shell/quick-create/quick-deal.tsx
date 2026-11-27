"use client";

import { NewDealForm } from "@/components/deals/new-deal-form";
import { FormMessage } from "@/components/auth/form-message";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { loadNewDealOptionsForReader } from "@/lib/deals/new-deal-options-actions";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { deals, dialogs };

/** « Nouveau deal »: the Deals page's form, its options read when the
 * window opens (a reader who opens no deal gets a message, not a form). */
export default function QuickDeal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = fr.deals.create;
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t.title}
      closeLabel={fr.dialogs.close}
    >
      <Loaded
        load={loadNewDealOptionsForReader}
        loadingLabel={t.loading}
        errorLabel={t.loadError}
      >
        {(options) =>
          options ? (
            <NewDealForm options={options} onDone={onClose} />
          ) : (
            <FormMessage kind="info">{t.noRight}</FormMessage>
          )
        }
      </Loaded>
    </FormDialog>
  );
}
