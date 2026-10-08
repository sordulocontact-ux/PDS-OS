import { isRequired } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Multi-line sibling of Field: label above, textarea, hint or error below.
// `addon`: a control laid in the textarea's bottom row (the microphone).
// The « * » follows `required` or `aria-required`, as in Field.
export function TextareaField({
  name,
  label,
  error,
  hint,
  addon,
  className,
  ...textareaProps
}: React.ComponentProps<"textarea"> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  addon?: React.ReactNode;
}) {
  const id = textareaProps.id ?? name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} required={isRequired(textareaProps)}>
        {label}
      </Label>
      <div className="relative">
        <Textarea
          key={String(textareaProps.defaultValue ?? "")}
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-h-24 text-base md:text-sm",
            addon && "pb-12",
            className,
          )}
          {...textareaProps}
        />
        {addon && (
          <div className="absolute inset-x-2 bottom-2 flex items-center">
            {addon}
          </div>
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
