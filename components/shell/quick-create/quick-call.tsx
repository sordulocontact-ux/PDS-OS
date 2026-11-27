"use client";

import { MeetingForm } from "@/components/calls/new-meeting-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { loadMeetingForm } from "@/lib/assistant/draft-record-actions";
import { calls } from "@/lib/i18n/fr/calls";
import { records } from "@/lib/i18n/fr/records";

const fr = { calls, records };

/** « Nouvelle réunion »: the Calls page's meeting form; created, the server
 * action opens the call's page. */
export default function QuickCall({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = fr.calls.meeting;
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t.title}
      description={t.description}
      closeLabel={fr.calls.link.close}
      size="wide"
    >
      <Loaded
        load={loadMeetingForm}
        loadingLabel={fr.records.edit.loading}
        errorLabel={fr.records.edit.loadFailed}
      >
        {(data) => <MeetingForm {...data} onCancel={onClose} />}
      </Loaded>
    </FormDialog>
  );
}
