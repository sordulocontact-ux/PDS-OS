import Link from "next/link";

import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import {
  requestAnchor,
  requestHref,
  type BriefRequest,
} from "@/lib/framing/brief-request-view";
import type { Dimension } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";

/**
 * The direction's return at the head of « Les 6 dimensions » (proto
 * « Retour de Claire Morel : « … » · Objectif »): its open requests, each
 * linked to its question (PROJ-UX-06), or its comment and the dimensions it
 * reopened. Nothing when there is no return.
 */
export function FramingReturn({
  projectId,
  requests,
  comment,
  reopened,
  by,
}: {
  projectId: string;
  requests: BriefRequest[];
  comment: string | null;
  reopened: string[];
  by: string | null;
}) {
  const t = fr.framingJourney.brief;
  if (requests.length > 0)
    return (
      <ToneCallout
        tone="warning"
        as="div"
        contentClassName="flex flex-col gap-1"
      >
        <p className="font-semibold">
          {fr.briefRequests.callout(requests.length)}
        </p>
        <ul className="flex flex-col gap-1">
          {requests.map((r) => (
            <li key={r.id} className="break-words">
              <Link
                href={requestHref(projectId, r)}
                className="underline underline-offset-4"
              >
                {requestAnchor(r)}
              </Link>{" "}
              : {r.body}
            </li>
          ))}
        </ul>
        <Link
          href={`${routes.projectFramingBrief(projectId)}#demandes`}
          className="self-start underline underline-offset-4"
        >
          {fr.briefRequests.seeAll}
        </Link>
      </ToneCallout>
    );
  if (!comment) return null;
  return (
    <ToneCallout tone="warning" as="div">
      {t.returned(
        by ?? "—",
        comment,
        reopened
          .map((d) => fr.framingIntel.dimensions[d as Dimension])
          .join(", "),
      )}
    </ToneCallout>
  );
}
