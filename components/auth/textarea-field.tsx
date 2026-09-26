import { FieldError } from "@/components/auth/form-message";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Multi-line sibling of Field: label above, textarea, hint or error below.
export function TextareaField({
  name,
  label,
  error,
  hint,
  ...textareaProps
}: React.ComponentProps<"textarea"> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  const id = textareaProps.id ?? name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        key={String(textareaProps.defaultValue ?? "")}
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="min-h-24 text-base md:text-sm"
        {...textareaProps}
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
