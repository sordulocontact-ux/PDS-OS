import "server-only";

import { cache } from "react";

import type { Access } from "@/lib/auth/access";
import type { ProductionNext } from "@/lib/production/next/types";
import type { ProductionPhase } from "@/lib/production/phase";
import { staffingCounts } from "@/lib/production/preprod/team";
import type { Holder, ProductionSheetData } from "@/lib/production/sheet";
import { preprodFor } from "@/lib/production/tab-data";
import { loadStepTools } from "@/lib/step-tools/queries";
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
  "changes",
  "replaced",
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
    const [
      preprod,
      quotesRes,
      creativesRes,
      optionsRes,
      versionsRes,
      tools,
      shootRes,
      proposalsRes,
    ] = await Promise.all([
      sheet ? preprodFor(projectId, deliverableId, access) : null,
      sheet
        ? supabase
            .from("production_quotes")
            .select("status, amount_cents")
            .eq("sheet_id", sheet.id)
            .order("deposited_at", { ascending: true })
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
      loadStepTools(projectId),
      sheet
        ? supabase
            .from("production_shoots")
            .select(
              "state, ended_at, video_rushes, audio_sources, backup_verified, files_location",
            )
            .eq("sheet_id", sheet.id)
            .maybeSingle()
        : null,
      sheet
        ? supabase
            .from("production_director_proposals")
            .select("id", { count: "exact", head: true })
            .eq("sheet_id", sheet.id)
            .eq("status", "proposed")
        : null,
    ]);
    const shoot = shootRes?.data ?? null;

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

    // Oldest first: a version's number is its rank (V1, V2…).
    const quotes = (quotesRes?.data ?? []).map((q, index) => ({
      number: index + 1,
      status: QUOTE.find((s) => s === q.status) ?? null,
      amountCents: q.amount_cents,
    }));
    const latest = quotes.at(-1) ?? null;
    const active = quotes.filter((q) => q.status === "approved").at(-1) ?? null;
    const items = preprod?.items ?? [];
    const actions = (preprod?.actions ?? []).filter(
      (a) => !a.templateKey?.startsWith("checklist:"),
    );
    const staff = staffingCounts(data.needs);
    const callSheet = preprod?.callSheet ?? null;
    const published = versionsRes?.data?.[0]?.number ?? null;
    const held = (preprod?.calls ?? [])
      .filter((c) => c.status === "ready")
      .map((c) => c.occurredAt)
      .sort();
    const progress = org ? Object.values(org.progress) : [];
    const here = (x: { module: string; subjectId: string | null }) =>
      x.module === "production" && x.subjectId === deliverableId;

    const input: JourneyInput = {
      projectId,
      deliverableId,
      kind: org?.kind ?? null,
      mode: sheet?.mode ?? "direct",
      opened: sheet !== null,
      owner,
      producer:
        person(
          org?.lineProducer?.personId ?? null,
          org?.lineProducer?.name ?? null,
        ) ?? owner,
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
        heldOn: held[0] ?? null,
        reported: held.length > 0,
        proposed:
          items.filter((it) => it.status === "proposed").length +
          actions.filter((a) => a.status === "draft").length,
        confirmed:
          items.filter((it) => it.status === "confirmed").length +
          actions.filter((a) => !a.itemId && a.status === "approved").length,
      },
      quote: {
        status: latest?.status ?? null,
        number: latest?.number ?? null,
        active: active
          ? { number: active.number, amountCents: active.amountCents }
          : null,
        revision: false,
      },
      directorProposals: proposalsRes?.count ?? 0,
      direction: {
        status: org?.direction.status ?? "draft",
        written: Boolean(sheet?.brief.stagingIntent && sheet.brief.runOfShow),
      },
      checklist: {
        total: progress.length,
        done: progress.filter(Boolean).length,
        companyOpen: progress.filter((x) => !x).length,
      },
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
      shotAt: shoot?.ended_at ?? null,
      rushes: {
        linked: Boolean(shoot?.files_location),
        received: Boolean(shoot?.video_rushes && shoot.audio_sources),
        backup: Boolean(shoot?.backup_verified),
      },
      phase,
      closed: Boolean(sheet?.closedAt),
      blockedSteps: tools.blockers
        .filter((b) => !b.lifted && here(b))
        .map((b) => b.stepKey),
      reworkSteps: [],
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
