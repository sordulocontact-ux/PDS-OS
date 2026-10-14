import { sectionCardClass } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

/** A card of the provider's page: a title, an optional hint, its content. */
export function ProviderSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(sectionCardClass, "flex flex-col gap-4")}>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && (
          <p className="text-sm text-pretty text-muted-foreground">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}
