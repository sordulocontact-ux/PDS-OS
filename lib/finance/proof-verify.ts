// What the code keeps of the AI's reading of a proof (Finance, new style
// lot 6, rule 6: the AI never produces an amount nor a date). The model
// copies each value as written; the code parses it and marks it verified
// only when the copy is in the PDF's own text (the logic of
// lib/assistant/verbatim.ts). Read from a photo, there is no text: every
// value stays « à vérifier » until a person checks it. Pure.

import type { ReceiptReading } from "@/lib/ai/schemas/receipt-reading";
import {
  parseSaidDate,
  parseSaidEuros,
  verbatimFrom,
} from "@/lib/assistant/verbatim";
import type { ProofKind, ProofReading, ProofValue } from "@/lib/finance/proofs";

export type VerifiedReading = {
  kind: ProofKind;
  values: ProofReading;
  verified: Record<ProofValue, boolean>;
};

const clean = (value: string | null | undefined, max: number) => {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

/** « 12/11/26 » too: a ticket often writes the year in two digits. */
function parseDay(quote: string): string | null {
  const short = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/.exec(quote.trim());
  return parseSaidDate(short ? `${short[1]}/${short[2]}/20${short[3]}` : quote);
}

const money = (quote: string | null) => {
  const cents = quote ? parseSaidEuros(quote) : null;
  return cents !== null && cents > 0 && cents <= 100_000_000_000 ? cents : null;
};

export function verifyReading(
  output: ReceiptReading,
  text: string | null,
): VerifiedReading {
  const said = verbatimFrom(text ? [text] : []);
  const found = (quote: string | null) =>
    text !== null && quote !== null && said.quote(quote) !== null;

  const vendor = clean(output.vendor, 200);
  const total = clean(output.total, 60);
  const vat = clean(output.vat, 60);
  const date = clean(output.date, 60);
  const reference = clean(output.reference, 120);

  const amountCents = money(total);
  const vatCents = vat ? parseSaidEuros(vat) : null;
  const issuedOn = date ? parseDay(date) : null;

  return {
    kind: output.kind,
    values: {
      vendor,
      amountCents,
      vatCents: vatCents !== null && vatCents >= 0 ? vatCents : null,
      issuedOn,
      reference,
    },
    verified: {
      vendor: vendor !== null && found(vendor),
      amount: amountCents !== null && found(total),
      vat: vatCents !== null && found(vat),
      issuedOn: issuedOn !== null && found(date),
      reference: reference !== null && found(reference),
    },
  };
}
