"use client";

import { ChoiceCards } from "@/components/ui/choice-cards";
import { fr } from "@/lib/i18n/fr";
import { CALL_FORMATS, type CallFormat } from "@/lib/strategy/call-prep";

/**
 * How a prepared exchange is held — visio, on site, by phone — with what is
 * recorded under each choice (Stratégie, Conception, Production).
 */
export function CallFormatField({
  value,
  onChange,
}: {
  value: CallFormat;
  onChange: (format: CallFormat) => void;
}) {
  const t = fr.strategyEntry.call;
  return (
    <ChoiceCards
      name="format"
      legend={t.format}
      required
      columns={3}
      value={value}
      onChange={onChange}
      choices={CALL_FORMATS.map((format) => ({
        value: format,
        label: t.formats[format],
        hint: t.formatHints[format],
      }))}
    />
  );
}
