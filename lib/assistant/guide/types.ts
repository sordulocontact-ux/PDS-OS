import type { Permission } from "@/lib/auth/redirects";

/**
 * One topic of PO's guide to PDS OS (docs/ASSISTANT.md § 3 quater): what a
 * part of the app is for, where it is, what one does there, and the
 * questions people ask about it. Written by the team in user's French, it
 * is data for the model, never an instruction. What code knows is not
 * written here: the sidebar label (`nav`), the link (`href`, or the open
 * project's `projectSection`) and who may act (`permissions`, read from
 * role_permissions) are added by lib/assistant/guide/index.ts.
 */
export type GuideTopic = {
  /** Stable key, the value app_guide is called with. */
  key: string;
  /** Name of the part of the app, as the screen shows it. */
  title: string;
  /** One sentence for the map of the app in PO's prompt. */
  summary: string;
  /** Words a question may use for it, lower case, without accents. */
  keywords: string[];
  /** A sidebar entry: its label and link are read from NAV_ITEMS. */
  nav?: string;
  /** A page outside the sidebar (settings…). */
  href?: string;
  /** A project's tab: linked on the open project, if any. */
  projectSection?: string;
  /** Where it is, when it is not a sidebar entry (« Dans un projet › onglet Juridique »). */
  where?: string;
  /** Sentences: what it is for, what one does there, its rules. */
  facts: string[];
  /** Frequent questions and their answer, as the team would give it. */
  faq?: { q: string; a: string }[];
  /** Who may act there: worded from role_permissions by code. */
  permissions?: Permission[];
};
