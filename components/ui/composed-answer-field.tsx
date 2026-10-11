import { labelClass } from "@/components/ui/option-class";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The answer written from the checked choices, edited freely (Stratégie,
 * Conception): its label, what qualifies it (proposed, provenance), the
 * text, and a control in its bottom corner (the microphone).
 */
export function ComposedAnswerField({
  id,
  label,
  badges,
  value,
  onChange,
  placeholder,
  addon,
  maxLength,
}: {
  id: string;
  label: string;
  badges?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  addon?: React.ReactNode;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {badges}
      </div>
      <div className="relative">
        <Textarea
          id={id}
          value={value}
          rows={3}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn("text-base md:text-sm", addon && "min-h-24 pb-12")}
        />
        {addon && (
          <div className="absolute inset-x-2 bottom-2 flex items-center">
            {addon}
          </div>
        )}
      </div>
    </div>
  );
}
