import { can, type Access } from "@/lib/auth/access";

/**
 * The « + » of the shell (Sacha, 27/11/2026): the creations one may start
 * from any page, in this fixed order. Only objects that live on their own
 * (never a step's gesture, which stays in its step), seven at most. The
 * same list feeds the « + » menu and the « Créer » group of the ⌘K.
 */
export const QUICK_ACTIONS = [
  "conversation",
  "mail",
  "expense",
  "call",
  "note",
  "contact",
  "deal",
] as const;

export type QuickAction = (typeof QUICK_ACTIONS)[number];

/** The reader's actions, filtered by what they may do (read on the server,
 * in the app's layout). The forms and the RLS still decide on saving. */
export function allowedQuickActions(
  access: Access,
  { mailbox }: { mailbox: boolean },
): QuickAction[] {
  const allowed: Record<QuickAction, boolean> = {
    conversation: true,
    mail: mailbox,
    // Same rule as the phone's former « + Dépense » (BUD 4).
    expense:
      can(access, "read_artist_budgets") || can(access, "pilot_projects"),
    call: true,
    note: true,
    contact: can(access, "manage_network"),
    deal:
      can(access, "validate") ||
      can(access, "pilot_projects") ||
      can(access, "open_deals"),
  };
  return QUICK_ACTIONS.filter((action) => allowed[action]);
}
