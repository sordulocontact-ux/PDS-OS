import "server-only";

import { cache } from "react";

import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import type { ProductionNext } from "@/lib/production/next/types";
import type { ProductionPhase } from "@/lib/production/phase";
import { staffingCounts } from "@/lib/production/preprod/team";
import type { Holder, ProductionSheetData } from "@/lib/production/sheet";
import { preprodFor } from "@/lib/production/tab-data";
import { createClient } from "@/lib/supabase/server";

import { journeySteps } from "./steps";
import type {
  JourneyInput,
  JourneyPerson,
  JourneyStep,
  QuoteStatus,
} from "./types";

const QUOTE: readonly QuoteStatus[] = [
  "deposited",
  "submitted",
  "approved",
  "rejected",
];

/**
 * The journey of one deliverable for the viewer: its steps, their state and
 * who acts now, from what the sheet, its preproduction, its quotes and its
 * phase say. Read once per request.
 */
export const loadJourney = cache(
  async (
    projectId: string,
    deliverableId: string,
    access: Access,
    data: ProductionSheetData,
    phase: ProductionPhase,
    next: ProductionNext | null,
  ): Promise<JourneyStep[]> => {
    const sheet = data.sheet;
    const me = access.personId;
    const supabase = await createClient();
    const [preprod, quotesRes, creativesRes, optionsRes, versionsRes] =
      await Promise.all([
        sheet ? preprodFor(projectId, deliverableId, access) : null,
        sheet
          ? supabase
              .from("production_quotes")
              .select("status")
              .eq("sheet_id", sheet.id)
              .order("deposited_at", { ascending: false })
          : null,
        supabase
          .from("project_creatives")
          .select("person_id")
          .eq("project_id", projectId),
        sheet
          ? supabase
              .from("production_location_options")
              .select("id", { count: "exact", head: true })
              .eq("sheet_id", sheet.id)
              .neq("status", "discarded")
          : null,
        sheet
          ? supabase
              .from("production_call_sheet_versions")
              .select("number")
              .eq("sheet_id", sheet.id)
              .order("number", { ascending: false })
              .limit(1)
          : null,
      ]);

    const person = (
      personId: string | null,
      name: string | null,
    ): JourneyPerson | null =>
      personId
        ? { name: name ?? "—", viewer: personId === me, viaLink: false }
        : null;
    const holder = (h: Holder | null): JourneyPerson | null =>
      h
        ? {
            name: h.name,
            viewer: h.kind === "person" && h.id === me,
            viaLink: h.kind === "contact",
          }
        : null;
    const org = sheet?.organization;
    const owner = person(data.ownerPersonId, data.ownerName) ?? {
      name: "—",
      viewer: false,
      viaLink: false,
    };
    const creatives = (creativesRes.data ?? []).map((c) =>
      person(
        c.person_id,
        data.members.find((m) => m.personId === c.person_id)?.name ?? null,
      ),
    );
    const creative =
      creatives.find((c) => c?.viewer) ?? creatives.find(Boolean) ?? owner;

    const quotes = (quotesRes?.data ?? []).map(
      (q) => QUOTE.find((s) => s === q.status) ?? null,
    );
    const items = preprod?.items ?? [];
    const staff = staffingCounts(data.needs);
    const callSheet = preprod?.callSheet ?? null;
    const published = versionsRes?.data?.[0]?.number ?? null;

    const input: JourneyInput = {
      projectId,
      deliverableId,
      kind: org?.kind ?? null,
      opened: sheet !== null,
      owner,
      producer:
        person(
          org?.lineProducer?.personId ?? null,
          org?.lineProducer?.name ?? null,
        ) ?? owner,
      producerRole: org?.lineProducer
        ? fr.productionJourney.roles.producer
        : fr.productionJourney.roles.owner,
      validator: person(
        org?.quoteValidator?.personId ?? null,
        org?.quoteValidator?.name ?? null,
      ),
      company: holder(org?.company ?? null),
      director: holder(sheet?.director ?? null),
      dop: holder(org?.dop ?? null),
      creative: creative ?? owner,
      call: {
        count: preprod?.calls.length ?? 0,
        reported: (preprod?.calls ?? []).some((c) => c.status === "ready"),
        proposed: items.filter((it) => it.status === "proposed").length,
        planned: (preprod?.actions ?? []).filter(
          (a) => a.itemId && a.status === "approved",
        ).length,
      },
      quote: {
        status: quotes[0] ?? null,
        approved: quotes.filter((s) => s === "approved").length,
      },
      direction: {
        status: org?.direction.status ?? "draft",
        written: Boolean(sheet?.brief.stagingIntent && sheet.brief.runOfShow),
      },
      progress: org ? Object.values(org.progress).filter(Boolean).length : 0,
      gear: {
        lines: preprod?.equipment.length ?? 0,
        positions: staff.positions,
        filled: staff.filled,
      },
      locations: {
        status: sheet?.logistics.locationStatus ?? "to_find",
        candidates: optionsRes?.count ?? 0,
        name: sheet?.logistics.locationName ?? null,
      },
      callSheet: {
        ready: Boolean(
          callSheet?.callTime?.trim() &&
          callSheet.emergencies?.trim() &&
          published,
        ),
        published,
      },
      readyAt: sheet?.readyAt ?? null,
      phase,
      closed: Boolean(sheet?.closedAt),
      later:
        next?.who && next.kind !== "done"
          ? {
              name: next.who.name ?? "—",
              viewer: next.viewerIsWho,
              viaLink: next.who.role === "provider",
              todo: next.title,
            }
          : null,
    };
    return journeySteps(input);
  },
);
