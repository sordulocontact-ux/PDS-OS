import Link from "next/link";

import {
  ResolveRequestButton,
  WithdrawRequestButton,
} from "@/components/framing/requests/request-actions";
import { RequestCard } from "@/components/framing/requests/request-card";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { FilterChipLink } from "@/components/ui/filter-chip";
import {
  isOpenRequest,
  requestChanged,
  requestHref,
  type BriefRequest,
} from "@/lib/framing/brief-request-view";
import { briefRequests } from "@/lib/i18n/fr/brief-requests";

const fr = { briefRequests };

type Version = {
  id: string;
  version: number;
  content: unknown;
  decided_by: string | null;
};

/**
 * The requests on the Brief page (PROJ-UX-06): the open ones by default, all
 * of them on demand, the same for the owner and the validator. The owner
 * corrects (link to the question) then marks corrected or justifies; the
 * validator who asked may withdraw.
 */
export function BriefRequestsSection({
  projectId,
  requests,
  versions,
  showAll,
  hrefOf,
  canAnswer,
  viewerPersonId,
}: {
  projectId: string;
  requests: BriefRequest[];
  versions: Version[];
  showAll: boolean;
  // The page's URL with the filter (?demandes=toutes or not).
  hrefOf: (all: boolean) => string;
  // The owner, while the Cadrage takes changes.
  canAnswer: boolean;
  viewerPersonId: string | null;
}) {
  const t = fr.briefRequests;
  if (requests.length === 0) return null;
  const open = requests.filter(isOpenRequest);
  const shown = showAll ? requests : open;
  const versionOf = (id: string | null) =>
    versions.find((v) => v.id === id)?.version ?? null;
  const askedBy = (r: BriefRequest) =>
    versions.find((v) => v.id === r.briefId)?.decided_by ?? null;

  return (
    <PageSection id="demandes" title={t.title} description={t.description}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <FilterChipLink href={hrefOf(false)} current={!showAll}>
            {t.views.open} ({open.length})
          </FilterChipLink>
          <FilterChipLink href={hrefOf(true)} current={showAll}>
            {t.views.all} ({requests.length})
          </FilterChipLink>
        </div>
        {shown.length === 0 ? (
          <p className="text-body-md text-muted-foreground">{t.emptyOpen}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((request) => {
              const isOpen = isOpenRequest(request);
              const changed = isOpen && requestChanged(request, versions);
              const mayWithdraw =
                isOpen &&
                viewerPersonId !== null &&
                askedBy(request) === viewerPersonId;
              return (
                <RequestCard
                  key={request.id}
                  projectId={projectId}
                  request={request}
                  versionOf={versionOf}
                  hint={isOpen ? (changed ? t.changed : t.notChanged) : null}
                  actions={
                    (isOpen && canAnswer) || mayWithdraw ? (
                      <>
                        {isOpen && canAnswer && (
                          <>
                            <Link
                              href={requestHref(projectId, request)}
                              className={buttonVariants({
                                size: "sm",
                                variant: "outline",
                              })}
                            >
                              {t.correct}
                            </Link>
                            <ResolveRequestButton
                              projectId={projectId}
                              requestId={request.id}
                              changed={changed}
                            />
                          </>
                        )}
                        {mayWithdraw && (
                          <WithdrawRequestButton
                            projectId={projectId}
                            requestId={request.id}
                          />
                        )}
                      </>
                    ) : null
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
    </PageSection>
  );
}
