import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/** Ready-made questions in pills: outlined on a page, filled in the window. */
export function AssistantSuggestions({
  onAsk,
  disabled,
  filled = false,
}: {
  onAsk: (question: string) => void;
  disabled: boolean;
  filled?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-5">
      {fr.assistant.suggestions.map((s) => (
        <Button
          key={s}
          variant={filled ? "secondary" : "outline"}
          onClick={() => onAsk(s)}
          disabled={disabled}
          className={cn(
            "h-auto py-3 font-medium text-secondary-foreground",
            // Window: wider pills, more room inside (demande de Sacha).
            filled ? "px-5" : "bg-transparent px-3",
          )}
        >
          {s}
        </Button>
      ))}
    </div>
  );
}
