import {
  IconCircleInfo,
  IconFile,
  type IconProps,
} from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import {
  documentCardClass,
  documentHeadClass,
} from "@/components/ui/document-card-classes";
import { DocumentCardFold } from "@/components/ui/document-card-fold";
import { cn } from "@/lib/utils";

/**
 * A document in head of its step (docs/VISION-UX.md rule 18, proto
 * `.doccard`, the one design since 04/11/2026): one frame, the head on a
 * soft strip — icon, name (« Contrat_Kader_Neons_v1.pdf »), the line that
 * says where it comes from, its state or action on the right (« Voir le
 * PDF ») —, what changed since the first version on an info strip, then its
 * body flush against the frame: `FactRows className="rounded-none
 * border-0"`, other content with its own padding (`px-3.5`). Without a body
 * (the Brief, a deposited file), the head alone: name and download.
 * `collapsible`: a chevron at the end of the head folds a long body (the
 * SACEM bulletin and its dossier, a person's link), open unless
 * `defaultOpen={false}` (the SACEM bulletin, folded on arrival: Sacha,
 * 10/11/2026).
 */
export function DocumentCard({
  name,
  line,
  action,
  change,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  icon: Icon = IconFile,
}: {
  name: string;
  line?: ReactNode;
  // A state pill, « Voir le PDF », « Voir le modèle »…
  action?: ReactNode;
  // « Changé depuis la v1 : … ».
  change?: ReactNode;
  children?: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  // A file by default; an envelope for an e-mail about to leave.
  icon?: React.ComponentType<IconProps>;
}) {
  const body = Boolean(change || children);
  const head = (
    <>
      <Icon aria-hidden className="size-5 shrink-0 text-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="font-semibold break-words">{name}</b>
        {line && (
          <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {line}
          </span>
        )}
      </span>
    </>
  );
  const rest = (
    <>
      {change && (
        <p
          className={cn(
            "flex items-start gap-2.5 bg-[var(--tone-info-bg)] px-3.5 py-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--tone-info-fg)]",
            children && "border-b border-[color:var(--border-hairline)]",
          )}
        >
          <IconCircleInfo aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{change}</span>
        </p>
      )}
      {children}
    </>
  );
  if (collapsible && body)
    return (
      <DocumentCardFold
        name={name}
        head={head}
        action={action}
        className={className}
        defaultOpen={defaultOpen}
      >
        {rest}
      </DocumentCardFold>
    );
  return (
    <section className={cn(documentCardClass, className)}>
      <div className={documentHeadClass(body)}>
        {head}
        {action}
      </div>
      {rest}
    </section>
  );
}
