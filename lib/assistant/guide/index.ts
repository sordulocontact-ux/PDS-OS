import "server-only";

import type { GuideTopic } from "@/lib/assistant/guide/types";
import { pageRecord } from "@/lib/assistant/page-context";
import type { PermissionHolders } from "@/lib/assistant/permission-holders";
import type { Source } from "@/lib/assistant/sources";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { assistantAccess } from "@/lib/i18n/fr/assistant-access";
import { assistantGuide } from "@/lib/i18n/fr/assistant-guide";
import { NAV_ITEMS } from "@/lib/ui/nav-items";

const fr = { assistantAccess, assistantGuide };

export {
  findTopics,
  GUIDE_TOPICS,
  guideMap,
} from "@/lib/assistant/guide/topics";

/**
 * PO's guide to PDS OS (docs/ASSISTANT.md § 3 quater): the topics written
 * by the team (topics/), plus what code knows so it never lies: the sidebar
 * label and link, the open project's tab, who may act (role_permissions).
 * Data for the model, never instructions.
 */
function whereOf(topic: GuideTopic): string | null {
  const t = fr.assistantGuide;
  const nav = topic.nav && NAV_ITEMS.find((item) => item.href === topic.nav);
  if (nav) return t.sidebar(nav.label);
  return topic.where ?? null;
}

export function linksOf(topic: GuideTopic, pagePath: string | null): Source[] {
  const nav = topic.nav && NAV_ITEMS.find((item) => item.href === topic.nav);
  const links: Source[] = [];
  if (nav) links.push({ label: nav.label, href: nav.href });
  else if (topic.href) links.push({ label: topic.title, href: topic.href });
  const page = pageRecord(pagePath);
  if (topic.projectSection && page?.kind === "project")
    links.push({
      label: fr.assistantGuide.inThisProject(topic.title),
      // « overview » is the project's own page, without a segment.
      href:
        topic.projectSection === "overview"
          ? routes.project(page.id)
          : `${routes.project(page.id)}/${topic.projectSection}`,
    });
  return links;
}

/** One topic as facts: where, what, its questions, who may act. */
export function topicFacts(
  topic: GuideTopic,
  access: Access,
  holders: PermissionHolders,
  pagePath: string | null,
): { facts: string[]; sources: Source[] } {
  const t = fr.assistantGuide;
  const where = whereOf(topic);
  const who = (topic.permissions ?? []).map((permission) =>
    fr.assistantAccess.guideWho(
      fr.assistantAccess.permissions[permission] ?? permission,
      holders.positions(permission).join(", ") ||
        fr.assistantAccess.nobodyHolds,
      can(access, permission),
    ),
  );
  return {
    facts: [
      t.topic(topic.title),
      ...(where ? [t.where(where)] : []),
      ...topic.facts,
      ...who,
      ...(topic.faq ?? []).map((f) => t.faq(f.q, f.a)),
    ],
    sources: linksOf(topic, pagePath),
  };
}
