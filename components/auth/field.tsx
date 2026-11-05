import { FieldError } from "@/components/auth/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// One form field: label above, input, hint or error below. `suffix`: a
// short unit laid at the end of the input ("€"). The « * » follows `required`,
// or `aria-required` when the form checks it itself (no native validation).
export function isRequired(props: {
  required?: boolean;
  "aria-required"?: boolean | "true" | "false";
}): boolean {
  return Boolean(props.required) || String(props["aria-required"]) === "true";
}

export function Field({
  name,
  label,
  error,
  hint,
  suffix,
  hideLabel = false,
  ...inputProps
}: React.ComponentProps<"input"> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  suffix?: string;
  // The label is read by screen readers only (a row already shows it).
  hideLabel?: boolean;
}) {
  const id = inputProps.id ?? name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        required={isRequired(inputProps)}
        className={hideLabel ? "sr-only" : undefined}
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          // Base UI refuses a default value changed after mount (it warns): a
          // value sent back by a server action remounts the input instead.
          key={String(inputProps.defaultValue ?? "")}
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("h-10 text-base md:text-sm", suffix && "pr-9")}
          {...inputProps}
        />
        {suffix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
