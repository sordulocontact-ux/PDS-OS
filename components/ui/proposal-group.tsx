"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { VersionCard } from "@/components/ui/version-card";
import { decisions } from "@/lib/i18n/fr/decisions";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { decisions };

const t = fr.decisions.proposal;

// Closes the add form of the group it sits in (after a successful add).
const AddFormContext = createContext<() => void>(() => undefined);

/** For an add form given to `ProposalGroup`: closes it once added. */
export const useCloseProposalAdd = () => useContext(AddFormContext);

/** The frame of a list of `ProposalRow` (proto `.rows`): joined rows. */
export function ProposalRows({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
      {children}
    </div>
  );
}

/**
 * A group of proposals (a dimension, a deliverable, « Tâches proposées »;
 * proto `versionCard` + `groupHead` + `addForm`): a `VersionCard` with its
 * state and « n à confirmer » (counted by the caller's code), open while
 * something waits. In its head, on the right, « Ajouter … » opens the
 * caller's form in its place (on a soft card; the form closes itself with
 * `useCloseProposalAdd`, or gets `close` when given as a function). Empty:
 * « Rien n'a été dit pendant l'échange. » or the module's sentence. The rows
 * are `ProposalRow`s in `ProposalRows`, given as children.
 */
export function ProposalGroup({
  id,
  title,
  status,
  toConfirm,
  meta,
  defaultOpen,
  note,
  addLabel,
  addForm,
  empty = false,
  emptyNote,
  children,
}: {
  // Anchor of the group (a link of the step points to it).
  id?: string;
  title: ReactNode;
  status?: { tone: Tone; label: string } | null;
  // Proposals still waiting: « n à confirmer » in the head.
  toConfirm: number;
  // Said in the head when nothing waits (« rien de dit »).
  meta?: ReactNode;
  defaultOpen?: boolean;
  // One line above the rows (what the group is for).
  note?: ReactNode;
  // « Ajouter un public »: shown only with `addForm` (who may add).
  addLabel?: string;
  addForm?: ReactNode | ((close: () => void) => ReactNode);
  empty?: boolean;
  emptyNote?: string;
  children?: ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  const close = () => setAdding(false);
  return (
    <VersionCard
      id={id}
      title={title}
      status={status}
      meta={toConfirm > 0 ? t.toConfirm(toConfirm) : meta}
      defaultOpen={defaultOpen ?? toConfirm > 0}
    >
      {note && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {note}
        </p>
      )}
      {addLabel &&
        addForm &&
        (adding ? (
          <div className="flex flex-col gap-2.5 rounded-2xl bg-[var(--surface-soft)] p-3.5">
            <AddFormContext.Provider value={close}>
              {typeof addForm === "function" ? addForm(close) : addForm}
            </AddFormContext.Provider>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              {addLabel}
            </Button>
          </div>
        ))}
      {empty ? (
        <p className="text-caption text-muted-foreground">
          {emptyNote ?? t.nothingSaid}
        </p>
      ) : (
        children
      )}
    </VersionCard>
  );
}
