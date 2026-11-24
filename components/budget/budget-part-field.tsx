"use client";

import { useEffect, useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { Label } from "@/components/ui/label";
import type { BudgetTarget } from "@/lib/budget/types";
import { loadSpendParts } from "@/lib/finance/budget-envelope-actions";
import { ENVELOPE_KINDS, type EnvelopeKind } from "@/lib/finance/envelopes";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

const isEnvelopeKind = (kind: string): kind is EnvelopeKind =>
  (ENVELOPE_KINDS as readonly string[]).includes(kind);

/**
 * « Sous-budget » of a spend: the parts of the budget it belongs to, only
 * when that budget has some and the reader may see them. `value`: undefined
 * while nothing is offered (the form then sends nothing), "" for « Aucun »,
 * else the part. Prefilled with the spend's current part when editing.
 */
export function BudgetPartField({
  target,
  lineId,
  value,
  onChange,
}: {
  target: BudgetTarget | null;
  lineId?: string;
  value: string | undefined;
  onChange: (partId: string | undefined) => void;
}) {
  const t = fr.budget.form;
  const [loaded, setLoaded] = useState<{
    key: string;
    parts: { id: string; name: string }[];
  } | null>(null);
  const kind = target?.kind;
  const targetId = target?.id;
  const key = `${kind}:${targetId}:${lineId}`;

  useEffect(() => {
    let live = true;
    if (!kind || !targetId || !isEnvelopeKind(kind)) return;
    void loadSpendParts({ kind, targetId, lineId }).then((found) => {
      if (!live) return;
      setLoaded({ key, parts: found.parts });
      // A sub-budget already chosen with the budget (its list) stays.
      const kept = found.parts.some((p) => p.id === value) ? value : undefined;
      onChange(found.parts.length ? (kept ?? found.current ?? "") : undefined);
    });
    return () => {
      live = false;
    };
    // onChange is a state setter of the form; `value` is read as the
    // budget changes, with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const parts = loaded?.key === key ? loaded.parts : [];
  if (parts.length === 0 || value === undefined) return null;
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor="budget-part">{t.part}</Label>
      <OptionSelect
        id="budget-part"
        fill
        label={t.part}
        options={{
          "": t.partNone,
          ...Object.fromEntries(parts.map((p) => [p.id, p.name])),
        }}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
