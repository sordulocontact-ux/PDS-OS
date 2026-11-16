"use client";

import { IconCalendarDays } from "nucleo-sharp-essential";
import { useState } from "react";

import { IconBan } from "@/components/icons";
import { LinkRows, type LinkRow } from "@/components/ui/link-rows";
import { ShowForm } from "@/components/finance/show-draw-forms";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Show, ShowFormat } from "@/lib/finance/engines";
import { cancelShow } from "@/lib/finance/funding-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { fundings } from "@/lib/i18n/fr/fundings";
import { formatDay } from "@/lib/utils/day";

const fr = { dialogs, fundings };

/**
 * The planned shows of one format, by date, as the rows of its card
 * (proto « Financements »): name, date and provisional titles, a badge
 * (« Prévue », or « Budget ouvert » once its budget replaces the format's
 * cost). The Finance moves a show (the forecast follows) or cancels it
 * from « ⋯ ».
 */
export function ShowsList({
  shows,
  format,
  formats,
  canManage,
}: {
  shows: Show[];
  format: ShowFormat;
  formats: ShowFormat[];
  canManage: boolean;
}) {
  const t = fr.fundings.shows;
  const [moving, setMoving] = useState<Show | null>(null);
  const [cancelling, setCancelling] = useState<Show | null>(null);
  const submit = useWriteSubmit(
    () => setCancelling(null),
    fr.fundings.done.showCancelled,
  );
  const rows = shows.map((show): LinkRow => ({
    key: show.id,
    href: null,
    main: show.label,
    sub: t.onDay(
      formatDay(show.plannedOn, { weekday: false }),
      format.provisionalTitles,
    ),
    end: (
      <span className="flex items-center gap-2">
        <StatusBadge tone={show.costCenterId ? "info" : "neutral"}>
          {show.costCenterId ? t.budgetOpen : t.planned}
        </StatusBadge>
        {canManage && (
          <RowActions
            label={t.rowActions(show.label)}
            actions={[
              {
                key: "move",
                label: t.move,
                icon: IconCalendarDays,
                onSelect: () => setMoving(show),
              },
              {
                key: "cancel",
                label: t.cancel,
                icon: IconBan,
                onSelect: () => setCancelling(show),
              },
            ]}
          />
        )}
      </span>
    ),
  }));
  return (
    <>
      {rows.length === 0 ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.noShows}
        </p>
      ) : (
        <LinkRows rows={rows} />
      )}
      {moving && (
        <FormDialog
          open
          onOpenChange={(next) => !next && setMoving(null)}
          title={t.form.moveTitle}
          description={t.form.description}
          closeLabel={fr.dialogs.close}
        >
          <ShowForm
            show={moving}
            formats={formats}
            onDone={() => setMoving(null)}
          />
        </FormDialog>
      )}
      {cancelling && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && setCancelling(null)}
          title={t.cancelTitle}
          description={t.cancelBody}
          cancelLabel={fr.dialogs.cancel}
          closeLabel={fr.dialogs.close}
          confirmLabel={t.cancel}
          pendingLabel={t.cancelling}
          pending={submit.pending}
          error={submit.error}
          onConfirm={() => submit.run(() => cancelShow(cancelling.id))}
        />
      )}
    </>
  );
}
