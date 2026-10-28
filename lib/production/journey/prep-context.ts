import "server-only";

import { notFound } from "next/navigation";
import { trackedCache } from "@/lib/projects/live-deps";

import { todayInParis } from "@/lib/insights/dates";
import { loadProviderLinks } from "@/lib/production/post/requests";
import { preprodOverview } from "@/lib/production/preprod/overview";
import { dueByStep } from "@/lib/production/preprod/schedule";
import { preprodFor } from "@/lib/production/tab-data";
import { createClient } from "@/lib/supabase/server";

import { journeyContext } from "./context";

/** A preparation step's data: the sheet's preproduction, its overview and
 * backward schedule, the providers' links. Read once per request. */
export const prepContext = trackedCache(
  async (projectId: string, deliverableId: string) => {
    const ctx = await journeyContext(projectId, deliverableId);
    const sheet = ctx.data.sheet;
    if (!sheet) notFound();
    const [preprod, links] = await Promise.all([
      preprodFor(projectId, deliverableId, ctx.access),
      loadProviderLinks(await createClient(), sheet.id),
    ]);
    if (!preprod) notFound();
    const today = todayInParis();
    const o = preprodOverview(ctx.data, preprod, today);
    return {
      ...ctx,
      sheet,
      preprod,
      o,
      today,
      due: dueByStep(o.logistics, today),
      links,
      common: {
        projectId,
        sheetId: sheet.id,
        canOrganize: ctx.data.canOrganize,
      },
      people: { members: ctx.data.members, contacts: ctx.data.contacts },
    };
  },
);
