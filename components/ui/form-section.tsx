import { useId } from "react";

import { cn } from "@/lib/utils";

// A titled block of a long form, on its own white card (the "Nouveau
// projet" page: Le projet, Informations initiales, Équipe). `plain`: the
// same block without the card, inside a modal or a side panel.
export function FormSection({
  title,
  plain = false,
  children,
}: {
  title: string;
  plain?: boolean;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col gap-5",
        !plain &&
          "rounded-xl border border-[color:var(--border-hairline)] bg-card p-4",
      )}
    >
      <h2 id={id} className="text-base font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}
