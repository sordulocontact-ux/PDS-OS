"use client";

import dynamic from "next/dynamic";

import { QuickConversation } from "@/components/shell/quick-create/quick-conversation";
import { QuickExpense } from "@/components/shell/quick-create/quick-expense";
import type { QuickAction } from "@/lib/shell/quick-actions";

// Each window's form loads when it opens.
const QuickMail = dynamic(
  () => import("@/components/shell/quick-create/quick-mail"),
);
const QuickCall = dynamic(
  () => import("@/components/shell/quick-create/quick-call"),
);
const QuickNote = dynamic(
  () => import("@/components/shell/quick-create/quick-note"),
);
const QuickContact = dynamic(
  () => import("@/components/shell/quick-create/quick-contact"),
);
const QuickDeal = dynamic(
  () => import("@/components/shell/quick-create/quick-deal"),
);

type Props = { open: boolean; onClose: () => void };

/** The real form of the chosen action, in its window, ending as it does on
 * its own page. */
export default function QuickCreateDialogs({
  current,
  open,
  onClose,
}: Props & { current: QuickAction }) {
  switch (current) {
    case "conversation":
      return <QuickConversation open={open} onClose={onClose} />;
    case "mail":
      return <QuickMail open={open} onClose={onClose} />;
    case "expense":
      return <QuickExpense open={open} onClose={onClose} />;
    case "call":
      return <QuickCall open={open} onClose={onClose} />;
    case "note":
      return <QuickNote open={open} onClose={onClose} />;
    case "contact":
      return <QuickContact open={open} onClose={onClose} />;
    case "deal":
      return <QuickDeal open={open} onClose={onClose} />;
  }
}
