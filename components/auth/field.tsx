import { FieldError } from "@/components/auth/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// One form field: label above, input, hint or error below.
export function Field({
  name,
  label,
  error,
  hint,
  ...inputProps
}: React.ComponentProps<"input"> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  const id = inputProps.id ?? name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-10 text-base md:text-sm"
        {...inputProps}
      />
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
