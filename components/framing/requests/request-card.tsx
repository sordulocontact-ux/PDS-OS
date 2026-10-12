import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  requestAnchor,
  requestHref,
  type BriefRequest,
} from "@/lib/framing/brief-request-view";
import { fr } from "@/lib/i18n/fr";
import { briefRequestTone } from "@/lib/ui/state-tones";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/** The state a request reads as: open, or how it was closed. */
export const requestStateKey = (r: BriefRequest) => r.resolution ?? "open";

/**
 * One request of the validator (PROJ-UX-06): where it points (a link that
 * opens the question to correct), what it asks, who asked and when, its
 * state, and how it was answered. `actions`: decided by the page.
 */
export function RequestCard({
  projectId,
  request,
  versionOf,
  hint,
  actions,
}: {
  projectId: string;
  request: BriefRequest;
  // The version number of a Brief version id.
  versionOf: (briefId: string | null) => number | null;
  hint?: string | null;
  actions?: React.ReactNode;
}) {
  const t = fr.briefRequests;
  const state = requestStateKey(request);
  const answered =
    request.resolvedAt &&
    (request.resolution === "modified"
      ? t.answered.modified(
          request.resolverName,
          dateFormat.format(new Date(request.resolvedAt)),
          versionOf(request.resolvedBriefId),
        )
      : request.resolution === "justified"
        ? t.answered.justified(
            request.resolverName,
            dateFormat.format(new Date(request.resolvedAt)),
          )
        : request.resolution === "withdrawn"
          ? t.answered.withdrawn(
              request.resolverName,
              dateFormat.format(new Date(request.resolvedAt)),
            )
          : null);
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={requestHref(projectId, request)}
          className="text-body-md font-semibold underline-offset-4 hover:underline"
        >
          {requestAnchor(request)}
        </Link>
        <StatusBadge tone={briefRequestTone[state]} size="sm">
          {t.states[state]}
        </StatusBadge>
        <span className="text-caption text-muted-foreground">
          {request.mandatory ? t.mandatory : t.optional}
        </span>
      </div>
      <p className="text-body-md break-words whitespace-pre-line">
        {request.body}
      </p>
      <p className="text-caption text-muted-foreground">
        {t.asked(
          request.authorName,
          dateFormat.format(new Date(request.createdAt)),
          versionOf(request.briefId),
        )}
      </p>
      {answered && (
        <div className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
          <p className="text-caption text-muted-foreground">{answered}</p>
          {request.resolutionNote && (
            <p className="text-body-md break-words whitespace-pre-line">
              {request.resolutionNote}
            </p>
          )}
        </div>
      )}
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}
