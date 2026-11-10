"use client";

import { IconCalendarDays } from "nucleo-sharp-essential";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { datePicker } from "@/lib/i18n/fr/date-picker";
import { todayInParis } from "@/lib/insights/dates";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import {
  formatTyped,
  isDay,
  maskTyped,
  monthOf,
  parseTyped,
} from "@/lib/utils/date-input";

const fr = { datePicker };

const inside = (box: Element | null, node: EventTarget | null | undefined) =>
  !!box && node instanceof Node && box.contains(node);

/**
 * The date field of the whole app, drawn by `Input type="date"`: same props as
 * the native field (`value`/`defaultValue` "YYYY-MM-DD", `onChange` reading
 * `event.target.value`, `name`, `min`, `max`, `required`), so no form changes.
 * At rest it reads « Sam. 05/12/2026 » (docs/DESIGN.md § 4, « Dates ») ; on
 * focus « 05/12/2026 », typed with the slashes put in place, and the calendar
 * opens under it. The form receives the day from a hidden field.
 */
export function DatePicker({
  className,
  name,
  form,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  min,
  max,
  placeholder,
  type: _type,
  ...props
}: ComponentProps<"input">) {
  void _type;
  const controlled = value !== undefined;
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const iso = controlled ? String(value ?? "") : inner;
  const minDay = typeof min === "string" && isDay(min) ? min : undefined;
  const maxDay = typeof max === "string" && isDay(max) ? max : undefined;
  const locked = Boolean(props.disabled || props.readOnly);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [month, setMonth] = useState(() => monthOf(iso || todayInParis()));

  const frame = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const popupId = `${useId()}-calendar`;
  const popup = () => document.getElementById(popupId);

  // The day just committed, read before the parent renders it back.
  const latest = useRef(iso);
  useEffect(() => {
    latest.current = iso;
  }, [iso]);

  const commit = (next: string) => {
    latest.current = next;
    if (!controlled) setInner(next);
    const el = hidden.current;
    if (!el || next === iso) return;
    el.value = next;
    onChange?.({
      target: el,
      currentTarget: el,
      type: "change",
    } as unknown as ChangeEvent<HTMLInputElement>);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const show = (withKeyboard: boolean) => {
    if (locked) return;
    setMonth(monthOf(iso || todayInParis()));
    setKeyboard(withKeyboard);
    setOpen(true);
  };

  // What was typed, read leniently (« 5/12 », « 5/12/26 ») once the field is
  // left; nothing readable gives back the last good day.
  const settle = () => {
    if (text.trim() === "") return commit("");
    const day = parseTyped(text, todayInParis());
    if (day) commit(day);
    setText(formatTyped(day ?? latest.current));
  };

  const choose = (day: string) => {
    commit(day);
    setText(formatTyped(day));
    setOpen(false);
    field.current?.focus();
  };

  // Native validation speaks for the typed text: a day that does not exist,
  // or one outside min / max (the form's own errors still come after).
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const typed = editing ? text.trim() : "";
    const unreadable =
      typed !== "" &&
      !parseTyped(typed, todayInParis()) &&
      formatTyped(iso) !== typed;
    el.setCustomValidity(
      unreadable
        ? fr.datePicker.invalid
        : iso && minDay && iso < minDay
          ? fr.datePicker.before(formatTyped(minDay))
          : iso && maxDay && iso > maxDay
            ? fr.datePicker.after(formatTyped(maxDay))
            : "",
    );
  }, [editing, text, iso, minDay, maxDay]);

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "ArrowDown" && !locked) {
      event.preventDefault();
      if (!open) return show(true);
      // Already open from a click: the arrows go into the days.
      setKeyboard(true);
      popup()
        ?.querySelector<HTMLButtonElement>('[role="grid"] button[tabindex="0"]')
        ?.focus();
    } else if (event.key === "Enter") {
      settle();
      // Picking a day closes the calendar; the form is sent on the next Enter.
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    } else if (event.key === "Escape" && open) {
      // Only the calendar closes, not the dialog around the form.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  const today = todayInParis();
  const todayAllowed = (!minDay || today >= minDay) && (!maxDay || today <= maxDay);
  const clearable = iso !== "" && !props.required && props["aria-required"] !== true && props["aria-required"] !== "true";

  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        // A press or a focus on the field itself keeps the calendar open.
        const target =
          details.event instanceof FocusEvent
            ? details.event.relatedTarget
            : details.event?.target;
        if (!next && inside(frame.current, target)) return;
        setOpen(next);
        if (next) return;
        if (details.reason === "escape-key") field.current?.focus();
        else if (document.activeElement !== field.current) setEditing(false);
      }}
    >
      <div
        ref={frame}
        data-slot="input"
        className={cn(
          "flex h-8 w-full min-w-0 items-center gap-1 rounded-lg border border-input bg-card pr-1 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-input/50 has-[input:disabled]:opacity-50 has-[input[aria-invalid=true]]:border-error has-[input[aria-invalid=true]]:ring-3 has-[input[aria-invalid=true]]:ring-error/20 md:text-sm",
          open && "border-ring",
          className,
        )}
      >
        <input
          {...props}
          ref={field}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          size={15}
          role="combobox"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popupId : undefined}
          placeholder={placeholder ?? fr.datePicker.placeholder}
          value={editing ? text : iso ? formatDay(iso) : ""}
          onFocus={(event) => {
            onFocus?.(event);
            setEditing(true);
            setText(formatTyped(latest.current));
            const el = event.currentTarget;
            requestAnimationFrame(() => el.select());
          }}
          onClick={() => !open && show(false)}
          onChange={(event) => {
            const deleting = (event.nativeEvent as InputEvent).inputType?.startsWith("delete") ?? false;
            const next = maskTyped(event.target.value, deleting);
            setText(next);
            if (next === "") return commit("");
            const day = parseTyped(next, todayInParis(), { complete: true });
            if (day) {
              commit(day);
              setMonth(monthOf(day));
            }
          }}
          onBlur={(event) => {
            onBlur?.(event);
            if (inside(popup(), event.relatedTarget) || inside(frame.current, event.relatedTarget)) return;
            settle();
            setEditing(false);
            setOpen(false);
          }}
          onKeyDown={keys}
          className="h-full w-full min-w-0 flex-1 bg-transparent px-2.5 tabular-nums outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={locked}
          aria-label={fr.datePicker.open}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? setOpen(false) : show(true))}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-[color:var(--text-tertiary)] [transition:var(--transition-control)] hover:bg-[var(--control-bg-hover)] hover:text-[color:var(--text-primary)] disabled:pointer-events-none"
        >
          <IconCalendarDays aria-hidden className="size-4" />
        </button>
        <input ref={hidden} type="hidden" name={name} form={form} value={iso} />
      </div>

      <PopoverContent
        id={popupId}
        anchor={frame}
        align="start"
        aria-label={fr.datePicker.dialog}
        initialFocus={false}
        finalFocus={false}
        // The text field keeps the focus while the mouse picks a day.
        onMouseDown={(event) => !keyboard && event.preventDefault()}
        className="w-auto"
      >
        <Calendar
          value={iso}
          today={today}
          min={minDay}
          max={maxDay}
          month={month}
          onMonthChange={setMonth}
          onSelect={choose}
          autoFocus={keyboard}
        />
        {(todayAllowed || clearable) && (
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            {todayAllowed ? (
              <Button type="button" variant="outline" size="sm" onClick={() => choose(today)}>
                {fr.datePicker.today}
              </Button>
            ) : (
              <span />
            )}
            {clearable && (
              <Button type="button" variant="ghost" size="sm" onClick={() => choose("")}>
                {fr.datePicker.clear}
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
