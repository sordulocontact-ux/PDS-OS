"use client";

import { Field } from "@/components/auth/field";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

const DATE_CLASS = "h-10 text-base md:text-sm";

/**
 * A contract's dates in its form: its due day (not for one that already
 * exists, `existing`), when it starts and ends. Each takes its column
 * (docs/DESIGN.md « Largeur d'un champ »).
 */
export function ContractDateFields({
  dueOn,
  startsOn,
  endsOn,
  endsOnError,
  existing,
}: {
  dueOn: string;
  startsOn: string;
  endsOn: string;
  endsOnError?: string;
  existing: boolean;
}) {
  const t = fr.contracts.form;
  return (
    <>
      {!existing && (
        <Field
          name="dueOn"
          type="date"
          label={t.dueOn}
          hint={t.dueOnHint}
          defaultValue={dueOn}
          className={DATE_CLASS}
        />
      )}
      {/* Side by side from 26rem (the usual modal); stacked in the column
          beside a document (22rem) and on a phone: a filled date with its
          day (« Mar. 01/12/2026 ») needs ~190 px. */}
      <div className="grid gap-5 @[26rem]:grid-cols-2">
        <Field
          name="startsOn"
          type="date"
          label={t.startsOn}
          defaultValue={startsOn}
          className={DATE_CLASS}
        />
        <Field
          name="endsOn"
          type="date"
          label={t.endsOn}
          defaultValue={endsOn}
          error={endsOnError}
          className={DATE_CLASS}
        />
      </div>
    </>
  );
}
