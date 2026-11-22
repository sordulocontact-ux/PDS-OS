import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import {
  asContractStatus,
  contractStateOf,
  todayInParis,
} from "@/lib/contracts/types";
import { isDealStage } from "@/lib/deals/types";
import { canEditProject } from "@/lib/projects/edit-access";
import {
  dealReach,
  NO_PROOF,
  participationContract,
  participationDeal,
  titleMasterState,
  type ContractProof,
  type ParticipationDeal,
  type ParticipationWaiver,
  type TitleBoard,
  type TitleVersion,
} from "@/lib/projects/title-board-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/**
 * « Titres et artistes » of a collective (docs/pds-mic-plan.md, lot 6): its
 * titles and participations (loadProjectTitles), and for each one what the
 * other modules hold — the participation's contract (title_participations.
 * contract_id, the only source, set from the person's contract once the
 * accord is validated) and what its copies say, its deal (Business
 * module), the title's
 * versions in this project's Master and its audio in the Catalogue.
 * Everything read with the viewer's session: RLS decides what each person
 * sees (a contract or a deal they may not read stays unread, never guessed);
 * no contact is read (décision 5). Each title only reads its own rows
 * (principle 1).
 */
export async function loadTitleBoard(
  project: { id: string; ownerPersonId: string | null },
  access: Access,
): Promise<TitleBoard> {
  const supabase = await createClient();
  const [titles, contracts, deals, versions, waivers, sources] =
    await Promise.all([
      loadProjectTitles(project.id),
      supabase
        .from("title_participations")
        .select(
          "id, contract_id, contract:contracts!title_participations_contract_same_org(id, title, status, ends_on, pds_signed_at)",
        )
        .eq("project_id", project.id),
      // A participation's deal carries the project (deals_participation_
      // project_check); the deals policy keeps only those the viewer reads.
      supabase
        .from("deals")
        .select(
          "id, participation_id, stage, agreement_status, stage_changed_at, next_action, next_action_on, follow_up_on, assignee_person_id, assignee:people!deals_assignee_person_id_fkey(first_name, last_name)",
        )
        .eq("project_id", project.id)
        .not("participation_id", "is", null),
      supabase
        .from("master_mix_versions")
        .select("master_id, stage, number, decision")
        .eq("project_id", project.id),
      // Lot 12: the waivers of the direction, read by whoever sees the
      // project (principle 5: traced, never hidden).
      supabase
        .from("participation_waivers")
        .select(
          "id, participation_id, scope, reason, risk, due_on, granted_at, revoked_at, revoke_reason, granter:people!participation_waivers_granted_by_fkey(first_name, last_name), revoker:people!participation_waivers_revoked_by_fkey(first_name, last_name)",
        )
        .eq("project_id", project.id)
        .order("granted_at", { ascending: false }),
      // Which titles have their source confirmed (the Master's rule of « Attendent
      // leur source »): the master only, grouped for every title.
      supabase
        .from("master_flow_sources")
        .select("master_id")
        .eq("project_id", project.id),
    ]);
  // A failed read is not « no contract » nor « no deal »: thrown to the
  // error page rather than shown as missing.
  if (contracts.error)
    throw new Error(`loadTitleBoard contracts: ${contracts.error.message}`);
  if (deals.error)
    throw new Error(`loadTitleBoard deals: ${deals.error.message}`);
  if (versions.error)
    throw new Error(`loadTitleBoard versions: ${versions.error.message}`);
  if (waivers.error)
    throw new Error(`loadTitleBoard waivers: ${waivers.error.message}`);
  if (sources.error)
    throw new Error(`loadTitleBoard sources: ${sources.error.message}`);
  const sourced = new Set((sources.data ?? []).map((row) => row.master_id));
  const waiversOf = new Map<string, ParticipationWaiver[]>();
  for (const row of waivers.data ?? []) {
    if (row.scope !== "shoot" && row.scope !== "release") continue;
    const list = waiversOf.get(row.participation_id) ?? [];
    list.push({
      id: row.id,
      scope: row.scope,
      reason: row.reason,
      risk: row.risk,
      dueOn: row.due_on,
      grantedBy: row.granter
        ? personName(row.granter.first_name, row.granter.last_name)
        : null,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      revokedBy: row.revoker
        ? personName(row.revoker.first_name, row.revoker.last_name)
        : null,
      revokeReason: row.revoke_reason,
    });
    waiversOf.set(row.participation_id, list);
  }

  const masterIds = titles.flatMap((title) =>
    title.master ? [title.master.id] : [],
  );
  // What the linked contracts' copies say (« Retour reçu »): which files
  // exist, never their names or paths. Only contracts the viewer reads.
  const contractIds = [
    ...new Set(
      (contracts.data ?? []).flatMap((row) =>
        row.contract ? [row.contract.id] : [],
      ),
    ),
  ];
  const [audio, files] = await Promise.all([
    masterIds.length
      ? supabase.from("masters").select("id, audio_state").in("id", masterIds)
      : { data: [], error: null },
    contractIds.length
      ? supabase
          .from("contract_files")
          .select("contract_id, category, via_contact_id")
          .in("contract_id", contractIds)
          .in("category", ["signed", "evidence"])
      : { data: [], error: null },
  ]);
  if (audio.error)
    throw new Error(`loadTitleBoard audio: ${audio.error.message}`);
  if (files.error)
    throw new Error(`loadTitleBoard contract files: ${files.error.message}`);
  const proofOf = new Map<string, ContractProof>();
  for (const row of contracts.data ?? [])
    if (row.contract)
      proofOf.set(row.contract.id, {
        ...NO_PROOF,
        countersigned: row.contract.pds_signed_at !== null,
      });
  for (const file of files.data ?? []) {
    const proof = proofOf.get(file.contract_id);
    if (!proof) continue;
    if (file.category === "signed") {
      proof.signedFiles += 1;
      if (file.via_contact_id) proof.signedViaLink = true;
    }
    if (file.category === "evidence") proof.evidence = true;
  }
  const finalInCatalogue = new Set(
    (audio.data ?? [])
      .filter((master) => master.audio_state === "final_master")
      .map((master) => master.id),
  );

  const today = todayInParis(new Date());
  const contractOf = new Map(
    (contracts.data ?? []).map((row) => [
      row.id,
      {
        contractId: row.contract_id,
        contract: row.contract
          ? {
              id: row.contract.id,
              title: row.contract.title,
              state: contractStateOf(
                {
                  status: asContractStatus(row.contract.status),
                  endsOn: row.contract.ends_on,
                },
                today,
              ),
              proof: proofOf.get(row.contract.id) ?? NO_PROOF,
            }
          : null,
      },
    ]),
  );

  const dealsOf = new Map<string, ParticipationDeal[]>();
  for (const row of deals.data ?? []) {
    if (!row.participation_id || !isDealStage(row.stage)) continue;
    const list = dealsOf.get(row.participation_id) ?? [];
    list.push({
      id: row.id,
      stage: row.stage,
      agreementStatus:
        row.agreement_status === "pending" ||
        row.agreement_status === "validated"
          ? row.agreement_status
          : null,
      assignee: row.assignee
        ? personName(row.assignee.first_name, row.assignee.last_name)
        : null,
      assigneeId: row.assignee_person_id,
      stageChangedAt: row.stage_changed_at,
      nextAction: row.next_action,
      nextActionOn: row.next_action_on,
      followUpOn: row.follow_up_on,
    });
    dealsOf.set(row.participation_id, list);
  }

  const versionsOf = new Map<string, TitleVersion[]>();
  for (const row of versions.data ?? []) {
    if (row.stage !== "mix" && row.stage !== "mastering") continue;
    const list = versionsOf.get(row.master_id) ?? [];
    list.push({
      stage: row.stage,
      number: row.number,
      decision:
        row.decision === "approved" || row.decision === "changes_requested"
          ? row.decision
          : null,
    });
    versionsOf.set(row.master_id, list);
  }

  return {
    titles: titles.map((title) => ({
      ...title,
      masterState: titleMasterState({
        hasMaster: title.master !== null,
        finalInCatalogue: title.master
          ? finalInCatalogue.has(title.master.id)
          : false,
        versions: title.master ? (versionsOf.get(title.master.id) ?? []) : [],
        sourced: title.master ? sourced.has(title.master.id) : false,
      }),
      participations: title.participations.map((participation) => {
        const linked = contractOf.get(participation.id);
        return {
          ...participation,
          contract: participationContract({
            status: participation.status,
            contractId: linked?.contractId ?? null,
            contract: linked?.contract ?? null,
          }),
          deal: participationDeal(dealsOf.get(participation.id) ?? []),
          waivers: waiversOf.get(participation.id) ?? [],
        };
      }),
    })),
    dealReach: dealReach({
      // can_read_deal: the direction, or the project's owner.
      readsAll: can(access, "validate") || canEditProject(access, project),
      visibleDeals: (deals.data ?? []).length,
    }),
  };
}

/**
 * What the gestures of « Titres et artistes » choose from, for whoever
 * writes the project (nothing read otherwise): the Catalogue's titles not
 * in the project yet (« Titre · Artistes »), and its active artists with
 * the project's main artist (never offered as a guest).
 */
export async function titleBoardChoices(
  project: { artistId: string | null },
  titles: Array<{ master: { id: string } | null }>,
  canManage: boolean,
): Promise<{
  masterOptions: Record<string, string>;
  artists: { options: Record<string, string>; mainArtistId: string | null };
}> {
  if (!canManage)
    return {
      masterOptions: {},
      artists: { options: {}, mainArtistId: project.artistId },
    };
  const [masters, artists] = await Promise.all([
    listMasterOptions(),
    listArtistOptions(),
  ]);
  const inProject = new Set(titles.map((title) => title.master?.id));
  return {
    masterOptions: Object.fromEntries(
      masters
        .filter((master) => !inProject.has(master.id))
        .map((master) => [
          master.id,
          master.artists ? `${master.title} · ${master.artists}` : master.title,
        ]),
    ),
    artists: {
      options: Object.fromEntries(artists.map((a) => [a.id, a.name])),
      mainArtistId: project.artistId,
    },
  };
}
