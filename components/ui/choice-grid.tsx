import { IconCheck } from "nucleo-sharp-essential";

import { Input } from "@/components/ui/input";
import { optionClass } from "@/components/ui/option-class";

/**
 * The closed choices of one question as outlined cards (blue once checked),
 * several at a time, then « Autre » with its text field (Stratégie,
 * Conception). State lives in the caller (useComposedAnswer).
 */
export function ChoiceGrid({
  options,
  selected,
  onToggle,
  other,
}: {
  options: Array<{ key: string; label: string }>;
  selected: string[];
  onToggle: (key: string) => void;
  other: {
    label: string;
    placeholder: string;
    // Names the text field: the question, then « Autre ».
    ariaLabel: string;
    on: boolean;
    value: string;
    maxLength: number;
    onToggle: () => void;
    onChange: (value: string) => void;
  };
}) {
  const card = (
    key: string,
    checked: boolean,
    label: string,
    onClick: () => void,
  ) => (
    <button
      key={key}
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={optionClass(checked)}
    >
      <span className="min-w-0 flex-1 font-medium break-words text-foreground">
        {label}
      </span>
      {checked && <IconCheck aria-hidden className="mt-1 size-4 shrink-0" />}
    </button>
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) =>
          card(o.key, selected.includes(o.key), o.label, () => onToggle(o.key)),
        )}
        {card("other", other.on, other.label, other.onToggle)}
      </div>
      {other.on && (
        <Input
          aria-label={other.ariaLabel}
          value={other.value}
          onChange={(e) => other.onChange(e.target.value)}
          placeholder={other.placeholder}
          maxLength={other.maxLength}
          className="h-10 text-base md:text-sm"
          autoFocus
        />
      )}
    </>
  );
}
