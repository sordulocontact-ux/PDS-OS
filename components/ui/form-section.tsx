import { useId } from "react";

import { sectionCardClass } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

// A titled block of a long form, on its own white card (the "Nouveau
// projet" page: Le projet, Informations initiales, Équipe). `plain`: the
// same block without the card, inside a modal.
// `description`: one line under the title, what the block is for.
export function FormSection({
  title,
  description,
  plain = false,
  children,
}: {
  title: string;
  description?: string;
  plain?: boolean;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col gap-5",
        !plain && sectionCardClass,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-base font-medium">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
