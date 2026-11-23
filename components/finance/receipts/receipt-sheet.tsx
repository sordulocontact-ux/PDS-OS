"use client";

import { SheetFacts, SheetHead } from "@/components/ui/side-sheet";
import { ReasonChips } from "@/components/finance/reason-chips";
import { proofFrom } from "@/components/finance/receipts/receipt-card";
import { ReceiptGestures } from "@/components/finance/receipts/receipt-gestures";
import { ReceiptPreview } from "@/components/finance/receipts/receipt-preview";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ProofRow, SpendRef } from "@/lib/finance/proof-view";
import {
  isPhoto,
  PROOF_VALUES,
  valueSource,
  type ProofValue,
  type ValueSource,
} from "@/lib/finance/proofs";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";
import { proofStateTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = financeReceipts;
const s = t.sheet;
/** Figures and dates in Geist Mono; names and references stay text. */
const NUMERIC = new Set<ProofValue>(["amount", "vat", "issuedOn"]);
const amount = (cents: number) => formatAmount(cents, { ht: false });

function sourceText(source: ValueSource) {
  switch (source.kind) {
    case "changed":
      return s.sources.changed(source.by ?? s.someone);
    case "checked":
      return s.sources.checked(source.by ?? s.someone);
    default:
      return s.sources[source.kind];
  }
}

function valueText(row: ProofRow, key: ProofValue) {
  const v = row.proof.values;
  if (key === "amount")
    return v.amountCents === null ? null : amount(v.amountCents);
  if (key === "vat") return v.vatCents === null ? null : amount(v.vatCents);
  if (key === "issuedOn") return v.issuedOn && formatDay(v.issuedOn);
  return v[key];
}

/** A spend named by a proof: its label, then where, when, how much. */
function Spend({ spend }: { spend: SpendRef }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p>{spend.label}</p>
      <p className="text-caption text-[color:var(--text-secondary)]">
        {[spend.envelope, formatDay(spend.day), amount(spend.cents)].join(
          " · ",
        )}
      </p>
    </div>
  );
}

/** What the sheet says under the reading, by state (proto, sheetReceipt). */
function Status({ row }: { row: ProofRow }) {
  const { proof, state } = row;
  const note = "text-caption text-[color:var(--text-secondary)]";
  if (state === "reading") return <p className={note}>{s.readingNow}</p>;
  if (state === "attached" && row.attached)
    return (
      <div className="flex flex-col gap-1">
        <p>{s.attachedTo(row.attached.label)}</p>
        {proof.attachedBy && (
          <p className={note}>{s.attachedBy(proof.attachedBy)}</p>
        )}
      </div>
    );
  if (state === "dismissed")
    return <p className={note}>{s.dismissed(proof.dismissReason ?? "")}</p>;
  if (state === "toCheck")
    return (
      <p className="text-caption text-[color:var(--tone-warning-fg)]">
        {proof.readState === "failed"
          ? s.readFailed
          : isPhoto(proof)
            ? s.photoNotice
            : s.notFoundNotice}
      </p>
    );
  if (state === "other") return <p className={note}>{s.otherNotice}</p>;
  const best = row.matches[0];
  if (!best) return <p className={note}>{s.noProposal}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className={note}>{s.proposal}</p>
      <Spend spend={best.spend} />
      <ReasonChips reasons={best.reasons.map((r) => t.reasons[r])} />
    </div>
  );
}

/**
 * A proof in Finance's side sheet (proto, page Justificatifs): who sent it
 * and when, its supplier and amount, the document itself, « Ce que PDS OS a
 * lu » with where each value comes from, the proposal and the gestures,
 * then its history.
 */
export function ReceiptSheet({
  row,
  choices,
  canManage,
}: {
  row: ProofRow;
  choices: SpendRef[];
  canManage: boolean;
}) {
  const { proof } = row;
  // The source said once, in the title, when most values share it; under a
  // value only when it differs.
  const shown = PROOF_VALUES.flatMap((key) => {
    const value = valueText(row, key);
    const source = valueSource(proof, key);
    if (
      !value &&
      source.kind === "none" &&
      key !== "amount" &&
      key !== "issuedOn"
    )
      return [];
    return [{ key, value, source }];
  });
  const counts = new Map<string, number>();
  for (const f of shown)
    counts.set(f.source.kind, (counts.get(f.source.kind) ?? 0) + 1);
  const dominant = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  return (
    <>
      <SheetHead
        eyebrow={s.eyebrow(
          proofFrom(row),
          formatDay(proof.receivedAt.slice(0, 10)),
        )}
        amount={
          proof.values.amountCents !== null
            ? amount(proof.values.amountCents)
            : undefined
        }
        caption={
          <>
            <StatusBadge tone={proofStateTone[row.state]} size="sm">
              {t.states[row.state]}
            </StatusBadge>
            {proof.kind && <span>{t.kinds[proof.kind]}</span>}
            {proof.emailFrom && <span>{s.byEmail(proof.emailFrom)}</span>}
          </>
        }
      />
      <ReceiptPreview proof={proof} />
      <section className="flex flex-col gap-3">
        <h3 className="text-caption font-semibold text-[color:var(--text-secondary)]">
          {dominant === "text"
            ? s.readIn.text
            : dominant === "photo"
              ? s.readIn.photo
              : s.read}
        </h3>
        <SheetFacts
          facts={shown.map(({ key, value, source }) => ({
            label: s.values[key],
            value: (
              <span className="flex flex-col gap-0.5">
                <span className={NUMERIC.has(key) ? "tabular-nums" : undefined}>
                  {value || "—"}
                </span>
                {(source.kind !== dominant ||
                  (dominant !== "text" && dominant !== "photo")) && (
                  <span className="text-caption text-[color:var(--text-tertiary)]">
                    {sourceText(source)}
                  </span>
                )}
              </span>
            ),
          }))}
        />
      </section>
      {row.state === "proposed" && row.matches[0] ? (
        // The proposal and its gestures in one box (proto, « Correspond à »).
        <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--selection)] p-4">
          <Status row={row} />
          {canManage && <ReceiptGestures row={row} choices={choices} />}
        </section>
      ) : (
        <>
          <Status row={row} />
          {canManage && <ReceiptGestures row={row} choices={choices} />}
        </>
      )}
    </>
  );
}
