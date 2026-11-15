"use client";

import { IconPlus } from "nucleo-sharp-essential";

import {
  CreditLineForm,
  EngineSettingsForm,
  ShowFormatForm,
} from "@/components/finance/funding-forms";
import { DrawForm, ShowForm } from "@/components/finance/show-draw-forms";
import { DialogButton } from "@/components/ui/dialog-button";
import type {
  CreditLine,
  EngineSettings,
  ShowFormat,
} from "@/lib/finance/engines";
import type { FinanceSpend } from "@/lib/finance/spends";
import { fundings } from "@/lib/i18n/fr/fundings";

const fr = { fundings };

/** « Régler » the Orchard rule. */
export function OrchardSettingsButton({
  settings,
}: {
  settings: EngineSettings;
}) {
  const t = fr.fundings.orchard;
  return (
    <DialogButton
      label={t.edit}
      size="xs"
      title={t.form.title}
      description={t.form.description}
    >
      {(close) => <EngineSettingsForm settings={settings} onDone={close} />}
    </DialogButton>
  );
}

/** « Nouveau format » (the Finance): what a kind of show costs and gives. */
export function NewFormatButton() {
  const t = fr.fundings.formats;
  return (
    <DialogButton
      label={t.add}
      title={t.form.title}
      description={t.form.description}
    >
      {(close) => <ShowFormatForm onDone={close} />}
    </DialogButton>
  );
}

/** « Nouvelle émission » on a format's card: the show form on that format. */
export function PlanShowButton({
  format,
  formats,
}: {
  format: ShowFormat;
  formats: ShowFormat[];
}) {
  const t = fr.fundings.shows;
  return (
    <DialogButton
      label={t.plan}
      icon={IconPlus}
      title={t.form.title}
      description={t.form.description}
    >
      {(close) => (
        <ShowForm
          show={null}
          formats={formats}
          initialFormatId={format.id}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

/** « Nouvelle ligne de crédit », « Nouveau tirage ». */
export function PayLaterButtons({
  lines,
  spends,
}: {
  lines: CreditLine[];
  spends: FinanceSpend[];
}) {
  const t = fr.fundings.payLater;
  return (
    <div className="flex flex-wrap gap-2">
      <DialogButton
        label={t.addLine}
        title={t.lineForm.title}
        description={t.lineForm.description}
      >
        {(close) => <CreditLineForm onDone={close} />}
      </DialogButton>
      {lines.some((l) => !l.archived) && (
        <DialogButton
          label={t.draw}
          icon={IconPlus}
          variant="default"
          title={t.drawForm.title}
          description={t.drawForm.description}
        >
          {(close) => <DrawForm lines={lines} spends={spends} onDone={close} />}
        </DialogButton>
      )}
    </div>
  );
}
