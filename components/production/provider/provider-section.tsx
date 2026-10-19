import { portalCardClass } from "@/components/portal/portal-card";

/** A card of a public page (the provider's space, the team's call sheet):
 * a title, an optional hint, its content; styled as the private pages'
 * cards (`PortalCard`). */
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
    <section className={portalCardClass}>
      <div className="flex flex-col gap-1">
        <h2 className="text-display-sm font-medium">{title}</h2>
        {hint && (
          <p className="text-sm text-pretty text-muted-foreground">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}
