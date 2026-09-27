import { IconMicrophone, IconPenWriting2 } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { createFirstFramingCall } from "@/lib/calls/actions-first-framing";
import { startFramingWithoutCall } from "@/lib/framing/actions/start-without-call";
import { fr } from "@/lib/i18n/fr";

/**
 * Shown while the project has no call report yet: two ways into the framing,
 * a call prepared by PO or straight to the Brief (docs/CONTEXTE-PROJET.md § 6,
 * usage 5 "Préparation de call"). Replaces the single-action FramingNeedsCall.
 */
export function FramingStart({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const t = fr.framing.needsCall;
  return (
    <section className="grid gap-6 rounded-xl border border-border p-6">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          {canEdit ? t.body : t.bodyReadOnly}
        </p>
      </div>

      {canEdit && (
        <div className="grid gap-3 sm:grid-cols-2">
          <FramingStartOption
            icon={IconMicrophone}
            title={t.withCall.title}
            body={t.withCall.body}
            action={createFirstFramingCall.bind(null, projectId)}
            actionLabel={t.withCall.action}
            variant="default"
          />
          <FramingStartOption
            icon={IconPenWriting2}
            title={t.withoutCall.title}
            body={t.withoutCall.body}
            action={startFramingWithoutCall.bind(null, projectId)}
            actionLabel={t.withoutCall.action}
            variant="outline"
          />
        </div>
      )}
    </section>
  );
}

function FramingStartOption({
  icon: Icon,
  title,
  body,
  action,
  actionLabel,
  variant,
}: {
  icon: typeof IconMicrophone;
  title: string;
  body: string;
  action: () => Promise<void>;
  actionLabel: string;
  variant: "default" | "outline";
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="grid gap-2">
        <Icon className="size-[22px] text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <form action={action} className="justify-self-start">
        <button type="submit" className={buttonVariants({ variant })}>
          {actionLabel}
        </button>
      </form>
    </div>
  );
}
