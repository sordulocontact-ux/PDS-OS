"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import type { ReviewItem } from "@/components/voice/dictation-review";
import { formatEuros } from "@/lib/budget/types";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import {
  rateCents,
  type BriefProposal,
} from "@/lib/master-workflow/brief-proposals";
import { applyBriefProposals } from "@/lib/master-workflow/brief-voice-actions";

const fr = { masterWorkflow };

const t = fr.masterWorkflow.brief;

/** Words a proposal of the Brief Mix/Master for review (dictation or
 * exchange): what changes, and to what. */
export function toBriefItem(
  p: BriefProposal,
): ReviewItem & { proposal: BriefProposal } {
  const r = t.review;
  const base = { id: p.id, located: p.located, before: p.before, proposal: p };
  switch (p.kind) {
    case "text":
      return {
        ...base,
        title: r.text(t.fields[p.field], p.before !== null),
        after: p.value,
      };
    case "engineer":
      return { ...base, title: r.engineer(r.roles[p.role]), after: p.name };
    case "same_engineer":
      return { ...base, title: r.sameEngineer, after: p.value ? r.yes : r.no };
    case "rate": {
      const cents = rateCents(p);
      return {
        ...base,
        title: r.rate(r.roles[p.role]),
        after: cents === null ? p.amount : formatEuros(cents),
      };
    }
    case "deliverable":
      return { ...base, title: r.deliverable, after: t.deliverables[p.key] };
  }
}

/** Applies the kept proposals; the page refreshes and the form shows them. */
export function useApplyBrief(projectId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const apply = (proposals: BriefProposal[], onDone: () => void) =>
    startTransition(async () => {
      const result = await applyBriefProposals(projectId, proposals);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.review.applied);
      onDone();
      router.refresh();
    });
  return { pending, apply };
}
