import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import {
  deliveryReadiness,
  type DeliveryReadiness,
} from "@/lib/release/delivery";
import type { ReleaseRow } from "@/lib/release/queries";
import { createClient } from "@/lib/supabase/server";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

export type DeliveryView = {
  releaseId: string;
  readiness: DeliveryReadiness;
  delivered: {
    on: string;
    to: string;
    note: string | null;
    by: string | null;
  } | null;
  online: {
    since: string;
    manual: boolean;
    url: string | null;
    by: string | null;
  } | null;
};

/** The release's delivery and going online, read with the user's session;
 * the readiness from the same sources as the workflows' states. */
export async function loadDelivery(
  projectId: string,
  release: ReleaseRow,
  access: Access,
): Promise<DeliveryView> {
  const supabase = await createClient();
  const [states, members, distributor] = await Promise.all([
    loadWorkflowStates(projectId),
    loadMembers(access),
    release.delivered_to_contact_id
      ? supabase
          .from("network_contacts")
          .select("name")
          .eq("id", release.delivered_to_contact_id)
          .maybeSingle()
      : null,
  ]);
  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? null)
      : null;
  const onlineSince =
    release.online_detected_at ?? release.online_confirmed_on ?? null;
  return {
    releaseId: release.id,
    readiness: deliveryReadiness({
      projectId,
      release: {
        isrc: release.isrc,
        upc: release.upc,
        plannedDate: release.planned_release_date,
      },
      dependencies: states?.dependencies ?? [],
    }),
    delivered: release.delivered_on
      ? {
          on: release.delivered_on,
          to: distributor?.data?.name ?? "—",
          note: release.delivery_note,
          by: nameOf(release.delivery_recorded_by),
        }
      : null,
    online: onlineSince
      ? {
          since: onlineSince,
          manual: release.online_detected_at === null,
          url: release.online_confirmed_url,
          by: nameOf(release.online_confirmed_by),
        }
      : null,
  };
}
