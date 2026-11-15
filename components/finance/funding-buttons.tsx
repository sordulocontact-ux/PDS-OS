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

/** « Planifier » a show, « Nouveau format ». */
export function ShowButtons({ formats }: { formats: ShowFormat[] }) {
  const t = fr.fundings;
  return (
    <div className="flex flex-wrap gap-2">
      <DialogButton
        label={t.formats.add}
        title={t.formats.form.title}
        description={t.formats.form.description}
      >
        {(close) => <ShowFormatForm onDone={close} />}
      </DialogButton>
      {formats.some((f) => !f.archived) && (
        <DialogButton
          label={t.shows.plan}
          icon={IconPlus}
          variant="default"
          title={t.shows.form.title}
          description={t.shows.form.description}
        >
          {(close) => <ShowForm show={null} formats={formats} onDone={close} />}
        </DialogButton>
      )}
    </div>
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
