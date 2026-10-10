import "server-only";

import { briefSnapshotOf } from "@/lib/strategy/documents/brief-snapshot";
import { strategyBriefHtml } from "@/lib/strategy/documents/brief-html";
import type { DocumentKind } from "@/lib/strategy/documents/model";
import { pressKitHtml } from "@/lib/strategy/documents/press-kit-html";
import { pressKitOf } from "@/lib/strategy/documents/press-kit-model";
import { releasePlanHtml } from "@/lib/strategy/documents/release-plan-html";
import { releasePlanOf } from "@/lib/strategy/documents/release-plan-model";

/**
 * A stored version of a strategy document as one standalone HTML page, the
 * source of its PDF (lib/pdf/render.ts). Null when the content cannot be
 * read as its kind.
 */
export function documentHtml(doc: {
  kind: DocumentKind;
  version: number;
  state: string;
  content: unknown;
}): string | null {
  switch (doc.kind) {
    case "brief": {
      const snapshot = briefSnapshotOf(doc.content);
      return snapshot
        ? strategyBriefHtml({
            snapshot,
            version: doc.version,
            state: doc.state,
          })
        : null;
    }
    case "release_plan": {
      // The same render as the preview and the shared link.
      const content = releasePlanOf(doc.content);
      return content ? releasePlanHtml(content) : null;
    }
    case "press_kit": {
      // The same render as the preview and the shared link.
      const content = pressKitOf(doc.content);
      return content ? pressKitHtml(content) : null;
    }
  }
}
