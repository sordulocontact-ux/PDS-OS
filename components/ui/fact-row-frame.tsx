import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { decisions } from "@/lib/i18n/fr/decisions";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { decisions };

const t = fr.decisions.fact;

/** Where a fact comes from: a sentence, or the words said and where. */
export type FactSource =
  | string
  | { quote: string; from: string; href?: string | null };

/** « Modifier » in place: the field, its proposal, the module's action. */
export type FactEdit = {
  kind?: "text" | "date" | "number" | "select";
  value: string;
  // kind « select »: { value: label }.
  options?: Record<string, string>;
  // The proposal as said under the field (« Dim. 15/11/2026 »).
  proposal?: string;
  // The field may be emptied.
  optional?: boolean;
  onSave: (value: string) => Promise<WriteResult>;
  done?: string;
};

/** « Changer »: a `PickList` (or `PersonPickList`), in place or in a modal. */
export type FactChange = {
  list: ReactNode;
  // Set: the list opens in a modal of that title.
  dialogTitle?: string;
  dialogDescription?: string;
  // Open from the start (default: when the value is missing).
  defaultOpen?: boolean;
};

export type FactRowProps = {
  label?: string;
  value?: ReactNode;
  source?: FactSource | null;
  state?: { tone: Tone; label: string } | null;
  // On the right: a button or a link of the module.
  side?: ReactNode;
  // Nobody chosen yet: the value in red, « À choisir » when empty.
  missing?: boolean;
  missingLabel?: string;
  // « Modifié par … » in the selection colour, instead of the source.
  changedBy?: string | null;
  // Full width under the row.
  below?: ReactNode;
};

/** The source line under the value (« Modifié par … » once changed). */
export function FactSourceText({
  source,
  changedBy,
}: Pick<FactRowProps, "source" | "changedBy">) {
  if (changedBy)
    return (
      <span className="text-caption text-[color:var(--selection)]">
        {t.changedBy(changedBy)}
      </span>
    );
  if (!source) return null;
  if (typeof source === "string")
    return <span className="text-caption text-muted-foreground">{source}</span>;
  return (
    <span className="text-caption break-words text-muted-foreground">
      « {source.quote} » ·{" "}
      {source.href ? (
        <Link
          href={source.href}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {source.from}
        </Link>
      ) : (
        source.from
      )}
    </span>
  );
}

/** The plain words of a source, for « Proposition : … · <source> ». */
export const factSourceWords = (source: FactSource | null | undefined) =>
  !source ? null : typeof source === "string" ? source : source.from;

/** The layout of a fact row, shared by the editable ones. */
export function FactRowFrame({
  label,
  value,
  source,
  state,
  side,
  missing,
  missingLabel = t.missing,
  changedBy,
  below,
  sourceNode,
}: FactRowProps & { sourceNode?: ReactNode }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="grid grid-cols-1 items-start gap-x-3 gap-y-1 border-b border-[color:var(--border-hairline)] px-3.5 py-2.75 text-body-sm last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 flex-col gap-0.5">
        {label && (
          <span className="text-caption text-muted-foreground">{label}</span>
        )}
        <span
          className={cn(
            "break-words [overflow-wrap:anywhere]",
            missing && "font-semibold text-error",
          )}
        >
          {missing && empty ? missingLabel : value}
        </span>
        {sourceNode ?? (
          <FactSourceText source={source} changedBy={changedBy} />
        )}
      </div>
      {(state || side) && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {state && (
            <StatusBadge tone={state.tone} size="sm">
              {state.label}
            </StatusBadge>
          )}
          {side}
        </div>
      )}
      {below && <div className="flex flex-col gap-2 md:col-span-2">{below}</div>}
    </div>
  );
}
