"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  durationText,
  RATIO_PRESETS,
  SUBTITLE_CHOICES,
  type FieldValue,
  type Money,
  type SheetFieldType,
} from "@/lib/design/sheet-model";
import { formatEuros, parseEuros } from "@/lib/design/sheet-fields";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { designSteps };

const t = fr.designSteps.sheets;

// A native select drawn like `Input` (proto `.in`).
const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

/** The field of a sheet in edition, by its type (proto fieldRow editor). */
export function SheetFieldEditor({
  id,
  type,
  value,
  onChange,
  invalid,
}: {
  id: string;
  type: SheetFieldType;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  invalid: boolean;
}) {
  const shared = { id, "aria-invalid": invalid || undefined, autoFocus: true };
  if (type === "ratios") {
    const list = Array.isArray(value) ? value : [];
    return (
      <span
        role="group"
        aria-labelledby={`${id}-label`}
        className="flex flex-wrap gap-x-4 gap-y-1.5"
      >
        {RATIO_PRESETS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={list.includes(r)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...list, r] : list.filter((x) => x !== r),
                )
              }
            />
            {r}
          </label>
        ))}
      </span>
    );
  }
  if (type === "subs")
    return (
      <select
        {...shared}
        className={selectClass}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{t.subtitlesPlaceholder}</option>
        {SUBTITLE_CHOICES.map((c, i) => (
          <option key={c} value={c}>
            {t.subtitles[i]}
          </option>
        ))}
      </select>
    );
  if (type === "money") {
    const m = value as Money | null;
    return (
      <span className="grid gap-2 sm:grid-cols-2">
        <Input
          {...shared}
          inputMode="numeric"
          placeholder={t.moneyPlaceholder}
          defaultValue={m ? formatEuros(m.cents) : ""}
          onChange={(e) => {
            const cents = parseEuros(e.target.value);
            onChange(
              cents === null ? null : { cents, engaged: m?.engaged ?? false },
            );
          }}
        />
        <select
          className={selectClass}
          aria-label={t.engaged}
          value={m?.engaged ? "1" : "0"}
          onChange={(e) =>
            onChange({ cents: m?.cents ?? 0, engaged: e.target.value === "1" })
          }
        >
          <option value="0">{t.notEngaged}</option>
          <option value="1">{t.engaged}</option>
        </select>
      </span>
    );
  }
  if (type === "long")
    return (
      <Textarea
        {...shared}
        rows={2}
        maxLength={4000}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  return (
    <Input
      {...shared}
      type={type === "date" ? "date" : "text"}
      placeholder={type === "duration" ? t.durationHint : undefined}
      maxLength={4000}
      defaultValue={
        type === "duration" && value
          ? durationText(Number(value))
          : typeof value === "string"
            ? value
            : ""
      }
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
