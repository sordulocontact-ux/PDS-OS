import type { ReactNode } from "react";

import { ButtonRoll, buttonVariants } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { VersionCard } from "@/components/ui/version-card";
import type { Tone } from "@/lib/ui/state-tones";

/**
 * One version of a deliverable (proposal, cover, quote, post-production cut):
 * the `DocumentCard` design, the head « V2 » with who deposited it and when
 * (`line`), its state pills and the « Ouvrir » / « Voir » outline button on
 * the right (`open`), then its pieces, its comments and its decision in the
 * body (`children`, padded here). Earlier versions go in `VersionCard` through
 * `DeliverableVersions`.
 */
export function DeliverableVersion({
  name,
  line,
  statuses,
  open,
  controls,
  change,
  children,
}: {
  name: string;
  line?: ReactNode;
  // State pills, the first one is the version's own state.
  statuses?: { tone: Tone; label: string }[];
  // « Ouvrir » / « Voir le devis »: an outline link to the version's file.
  open?: { href: string; label: string } | null;
  // Menus and dialogs of the version (« ⋯ », « Demander des corrections »).
  controls?: ReactNode;
  // « Répond à la demande … ».
  change?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <DocumentCard
      name={name}
      line={line}
      change={change}
      action={
        <span className="flex flex-wrap items-center gap-1.5">
          {statuses?.map((s) => (
            <StatusBadge key={s.label} tone={s.tone}>
              {s.label}
            </StatusBadge>
          ))}
          {open && (
            <a
              href={open.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ButtonRoll>{open.label}</ButtonRoll>
            </a>
          )}
          {controls}
        </span>
      }
    >
      {children && <div className="flex flex-col gap-3 p-3.5">{children}</div>}
    </DocumentCard>
  );
}

/**
 * The versions of a deliverable, newest first: the current ones (`isCurrent`:
 * the latest, the retained one) open as a `DeliverableVersion`, the others
 * folded under « Versions précédentes » in a `VersionCard`.
 */
export function DeliverableVersions<T extends { id: string }>({
  versions,
  isCurrent,
  render,
  earlierTitle,
}: {
  versions: T[];
  isCurrent: (v: T, index: number) => boolean;
  render: (v: T) => ReactNode;
  earlierTitle: (count: number) => ReactNode;
}) {
  const current = versions.filter(isCurrent);
  const earlier = versions.filter((v, i) => !isCurrent(v, i));
  return (
    <div className="flex flex-col gap-3">
      {current.map((v) => (
        <div key={v.id}>{render(v)}</div>
      ))}
      {earlier.length > 0 && (
        <VersionCard title={earlierTitle(earlier.length)}>
          {earlier.map((v) => (
            <div key={v.id}>{render(v)}</div>
          ))}
        </VersionCard>
      )}
    </div>
  );
}
