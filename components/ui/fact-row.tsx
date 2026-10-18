import type { ReactNode } from "react";

import { FactRowChangeable } from "@/components/ui/fact-row-change";
import { FactRowEditable } from "@/components/ui/fact-row-edit";
import {
  FactRowFrame,
  type FactChange,
  type FactEdit,
  type FactRowProps,
} from "@/components/ui/fact-row-frame";
import { cn } from "@/lib/utils";

export type {
  FactChange,
  FactEdit,
  FactRowProps,
  FactSource,
} from "@/components/ui/fact-row-frame";

/** The frame of fact rows (proto `.rows`): joined rows in a hairline. */
export function FactRows({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * One fact with its source (docs/VISION-UX.md rules 2 to 4, proto `fact()`):
 * label, value, the source under the value (a sentence, or « « words » ·
 * where », a link when it has a page), a state pill or a button on the
 * right. `missing`: « À choisir » in red, never a guess. `changedBy`:
 * « Modifié par … » in the selection colour. `edit`: « Modifier » turns the
 * row into its field (Entrée saves, Échap cancels, the code's refusal in
 * red). `change`: « Changer » opens a `PickList`. Only the module decides
 * who may (responsible or actor, step in progress): no `edit`/`change`
 * otherwise.
 */
export function FactRow({
  edit,
  change,
  ...row
}: FactRowProps & { edit?: FactEdit | null; change?: FactChange | null }) {
  if (edit) return <FactRowEditable {...row} edit={edit} />;
  if (change) return <FactRowChangeable {...row} change={change} />;
  return <FactRowFrame {...row} />;
}
