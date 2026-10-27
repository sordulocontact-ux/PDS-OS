"use client";

import { useEffect } from "react";

import { useAssistant } from "@/components/assistant/assistant-provider";
import { Button } from "@/components/ui/button";
import { assistant } from "@/lib/i18n/fr/assistant";
import { cn } from "@/lib/utils";

const fr = { assistant };

/**
 * Ready-made questions in pills: outlined on a page, filled in the window.
 * The open page may put its own first (`PageSuggestions`).
 */
export function AssistantSuggestions({
  onAsk,
  disabled,
  filled = false,
}: {
  onAsk: (question: string) => void;
  disabled: boolean;
  filled?: boolean;
}) {
  const { pageSuggestions } = useAssistant();
  const suggestions = [...pageSuggestions, ...fr.assistant.suggestions].slice(
    0,
    4,
  );
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-5">
      {suggestions.map((s) => (
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

/**
 * Puts questions of the open page first among PO's suggestions, as long as
 * it is shown (the home's project to accept, UX test of 09/10/2026).
 */
export function PageSuggestions({ items }: { items: string[] }) {
  const { setPageSuggestions } = useAssistant();
  const key = items.join("\n");
  useEffect(() => {
    setPageSuggestions(key ? key.split("\n") : []);
    return () => setPageSuggestions([]);
  }, [key, setPageSuggestions]);
  return null;
}
