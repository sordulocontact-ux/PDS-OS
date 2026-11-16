"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { SmallForm, positive, whole } from "@/components/finance/funding-forms";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { EngineSettings } from "@/lib/finance/engines";
import { saveEngineSettings } from "@/lib/finance/funding-actions";
import { fundings } from "@/lib/i18n/fr/fundings";
import { amountInput } from "@/lib/utils/money";

const fr = { fundings };

/**
 * « Contrat The Orchard » (Ibé, 16/11/2026): the contract's total, the
 * advance per tranche and its titles, the day from which the Distribution's
 * deposits count, the titles delivered outside PDS OS and the advances
 * already received. Everything else is computed.
 */
export function OrchardContractForm({
  settings,
  onDone,
}: {
  settings: EngineSettings;
  onDone: () => void;
}) {
  const t = fr.fundings.orchard.form;
  const submit = useWriteSubmit(onDone, "");
  const [contract, setContract] = useState(
    settings.orchardContractCents === null
      ? ""
      : amountInput(settings.orchardContractCents),
  );
  const [tranche, setTranche] = useState(
    amountInput(settings.orchardTrancheCents),
  );
  const [per, setPer] = useState(String(settings.orchardTitlesPerTranche));
  const [countsFrom, setCountsFrom] = useState(
    settings.orchardCountsFrom ?? "",
  );
  const [counted, setCounted] = useState(String(settings.orchardTitlesCounted));
  const [received, setReceived] = useState(
    String(settings.orchardAdvancesReceived),
  );
  const [tried, setTried] = useState(false);
  const errors = {
    contract:
      contract.trim() === "" || positive(contract)
        ? undefined
        : t.errors.contract,
    tranche: positive(tranche) ? undefined : t.errors.tranche,
    per: whole(per, 1, 1000) ? undefined : t.errors.per,
    counted: whole(counted, 0, 100000) ? undefined : t.errors.counted,
    received: whole(received, 0, 1000) ? undefined : t.errors.received,
  };
  const shown = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <SmallForm
      submit={submit}
      saveLabel={t.save}
      savingLabel={t.saving}
      onCancel={onDone}
      onSubmit={() => {
        setTried(true);
        if (!Object.values(errors).some(Boolean))
          submit.run(() =>
            saveEngineSettings({
              tranche,
              contract,
              per: Number(per),
              countsFrom,
              counted: Number(counted),
              received: Number(received),
            }),
          );
      }}
    >
      <Field
        name="orchard-contract"
        label={t.contract}
        suffix="€"
        inputMode="decimal"
        value={contract}
        hint={t.contractHint}
        error={shown("contract")}
        onChange={(e) => setContract(e.target.value)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="orchard-tranche"
          label={t.tranche}
          suffix="€"
          required
          inputMode="decimal"
          value={tranche}
          error={shown("tranche")}
          onChange={(e) => setTranche(e.target.value)}
        />
        <Field
          name="orchard-per"
          label={t.per}
          required
          inputMode="numeric"
          value={per}
          error={shown("per")}
          onChange={(e) => setPer(e.target.value)}
        />
      </div>
      <Field
        name="orchard-counts-from"
        label={t.countsFrom}
        type="date"
        value={countsFrom}
        hint={t.countsFromHint}
        onChange={(e) => setCountsFrom(e.target.value)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="orchard-counted"
          label={t.counted}
          required
          inputMode="numeric"
          value={counted}
          hint={t.countedHint}
          error={shown("counted")}
          onChange={(e) => setCounted(e.target.value)}
        />
        <Field
          name="orchard-received"
          label={t.received}
          required
          inputMode="numeric"
          value={received}
          error={shown("received")}
          onChange={(e) => setReceived(e.target.value)}
        />
      </div>
    </SmallForm>
  );
}
