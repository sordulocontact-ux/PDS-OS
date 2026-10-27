"use client";

import { useRouter } from "next/navigation";

import { BriefRequestForm } from "@/components/framing/intel/brief-request-form";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Fold } from "@/components/ui/fold";
import { decideBrief } from "@/lib/framing/actions/brief-versions";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingJourney };

/**
 * Detailed corrections (PROJ-UX-06), folded under the direction's
 * decision: a list of requests, each on a dimension or a question,
 * mandatory or not, to correct or justify one by one.
 */
export function BriefDetailedRequest({
  projectId,
  validationId,
}: {
  projectId: string;
  validationId: string;
}) {
  const router = useRouter();
  const { pending, run, error } = useFramingAction({ inline: true });
  return (
    <Fold summary={fr.framingJourney.brief.detailed}>
      <BriefRequestForm
        pending={pending}
        error={error}
        onCancel={() => router.refresh()}
        onSubmit={(requests, comment) =>
          run(() =>
            decideBrief(projectId, validationId, false, comment, requests),
          )
        }
      />
    </Fold>
  );
}
