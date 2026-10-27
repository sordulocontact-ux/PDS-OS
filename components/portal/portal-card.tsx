import { StatusBadge } from "@/components/ui/status-badge";
import { portal } from "@/lib/i18n/fr/portal";
import { cn } from "@/lib/utils";

const fr = { portal };

const t = fr.portal;

export type PortalCardState = "todo" | "waiting" | "done";
const TONE = { todo: "info", waiting: "neutral", done: "success" } as const;

/** What a card asks of the person: « **Déposer le devis** · avant le 22/10 ». */
export type PortalAction = { label: string; due?: string | null };

export const portalCardClass =
  "flex min-w-0 scroll-mt-4 flex-col gap-3.5 rounded-xl border border-[color:var(--border-hairline)] bg-card p-5";

/**
 * One step of a private page (proto portalCards): its title and its pill
 * (« À vous », « En attente de PDS », « Fait »), what is asked and by when,
 * then the step's own content (reading or the external's gesture).
 */
export function PortalCard({
  id,
  title,
  state,
  badge,
  action,
  lead = false,
  className,
  children,
}: {
  id: string;
  title: string;
  state: PortalCardState;
  // The pill's words when they are not the state's (« Invité »).
  badge?: string;
  action?: PortalAction | null;
  // « À vous » framed like a step's lead (StepPanel `lead`).
  lead?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        portalCardClass,
        lead && state === "todo" && "border-[color:var(--selection-border)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-display-sm font-medium text-balance">{title}</h2>
        <StatusBadge size="sm" tone={TONE[state]}>
          {badge ?? t.states[state]}
        </StatusBadge>
      </div>
      {action && state === "todo" && (
        <p className="text-muted-foreground">
          <b className="font-semibold text-foreground">{action.label}</b>
          {action.due && ` · ${t.due(action.due)}`}
        </p>
      )}
      {children}
    </section>
  );
}
