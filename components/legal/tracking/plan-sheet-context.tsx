"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "@/components/ui/toast";

import { useShowSplitLinks } from "@/components/legal/splits/split-actions";
import { advanceContract } from "@/lib/contracts/actions";
import { legal } from "@/lib/i18n/fr/legal";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { generateLegalContract } from "@/lib/legal/contracts/actions";
import { openFormality } from "@/lib/legal/formalities/actions";
import { prepareLegalForm, setLegalFormState } from "@/lib/legal/forms/actions";
import type { RowAction } from "@/lib/legal/plan/board";
import { proposeSplit } from "@/lib/legal/splits/actions";

const fr = { legal, legalForms };

/** A fiche's link just prepared: shown once, in its panel. */
export type PreparedLink = {
  url: string;
  email: string | null;
  project: string;
};

type PlanSheet = {
  // The line whose panel is open (`?ligne=` in the URL), or null.
  openId: string | null;
  open: (id: string) => void;
  close: () => void;
  // The next line that waits for the team, after `id` (the plan's order).
  nextOf: (id: string) => { id: string; label: string } | null;
  links: Record<string, PreparedLink>;
  setLink: (personKey: string, link: PreparedLink | null) => void;
  // Runs a line's verb when it needs nothing typed, then opens its panel.
  act: (rowId: string, action: RowAction) => void;
  acting: string | null;
};

const Context = createContext<PlanSheet | null>(null);

export function usePlanSheet(): PlanSheet {
  const value = useContext(Context);
  if (!value) throw new Error("usePlanSheet outside PlanSheetProvider");
  return value;
}

// The open line in the URL, without a round trip to the server: a refresh
// after an action renders the same line open (UX test of 09/10/2026: every
// panel closed after an action).
function writeLine(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("ligne", id);
  else url.searchParams.delete("ligne");
  window.history.replaceState(window.history.state, "", url);
}

/**
 * The Plan d'action's panels: one open at a time, kept open across the
 * refresh an action triggers, « Suivant » to the next line that waits for
 * the team, and the verbs that act at once.
 */
export function PlanSheetProvider({
  projectId,
  initialOpen,
  actionable,
  children,
}: {
  projectId: string;
  initialOpen: string | null;
  // The lines that wait for the team, in the plan's order.
  actionable: Array<{ id: string; label: string }>;
  children: React.ReactNode;
}) {
  const [openId, setOpenId] = useState(initialOpen);
  const [links, setLinks] = useState<Record<string, PreparedLink>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const showSplitLinks = useShowSplitLinks();

  const open = useCallback((id: string) => {
    setOpenId(id);
    writeLine(id);
  }, []);
  const close = useCallback(() => {
    setOpenId(null);
    writeLine(null);
  }, []);
  const setLink = useCallback(
    (key: string, link: PreparedLink | null) =>
      setLinks((all) => {
        const next = { ...all };
        if (link) next[key] = link;
        else delete next[key];
        return next;
      }),
    [],
  );

  const act = useCallback(
    (rowId: string, action: RowAction) => {
      setActing(rowId);
      startTransition(async () => {
        const failed = (error?: string) =>
          void toast.error(error ?? fr.legal.panels.contract.failed);
        try {
          switch (action.kind) {
            case "prepareFiche": {
              const result = await prepareLegalForm(
                projectId,
                action.personKey,
              );
              if (!result.ok) return failed(result.error);
              if (result.emailed === "sent")
                toast.success(fr.legalForms.page.emailed.sentHere);
              else {
                if (result.emailed === "failed")
                  toast.warning(fr.legalForms.page.emailed.failed);
                setLink(action.personKey, result);
              }
              break;
            }
            case "markSent": {
              const result = await setLegalFormState(
                projectId,
                action.formId,
                "sent",
              );
              if (!result.ok) return failed(result.error);
              break;
            }
            case "generateContract": {
              const result = await generateLegalContract(
                projectId,
                action.needId,
              );
              if (!result.ok) return failed(result.error);
              break;
            }
            case "submitContract": {
              const result = await advanceContract({
                contractId: action.contractId,
                action: "submit",
              });
              if (!result.ok) return failed(result.error);
              break;
            }
            case "proposeSplit": {
              const result = await proposeSplit(projectId, action.versionId);
              if (!result.ok) return failed(result.error);
              showSplitLinks(action.title, result.data);
              break;
            }
            case "openFormality": {
              const result = await openFormality(projectId, action.masterId);
              if (!result.ok) return failed(result.error);
              break;
            }
          }
          open(rowId);
        } finally {
          setActing(null);
        }
      });
    },
    [open, projectId, setLink, showSplitLinks],
  );

  const value = useMemo<PlanSheet>(
    () => ({
      openId,
      open,
      close,
      nextOf: (id) => {
        const at = actionable.findIndex((line) => line.id === id);
        const after = [
          ...actionable.slice(at + 1),
          ...actionable.slice(0, Math.max(at, 0)),
        ].filter((line) => line.id !== id);
        return after[0] ?? null;
      },
      links,
      setLink,
      act,
      acting,
    }),
    [openId, open, close, actionable, links, setLink, act, acting],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
