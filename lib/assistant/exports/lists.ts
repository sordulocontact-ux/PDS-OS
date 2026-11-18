import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { listArtists, listMasters } from "@/lib/catalog/queries";
import { formatDuration, formatIsrc, masterLabel } from "@/lib/catalog/types";
import { listContracts } from "@/lib/contracts/queries";
import {
  financeCsv,
  EXPORT_TYPES,
  type ExportType,
} from "@/lib/finance/exports";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";
import { catalog } from "@/lib/i18n/fr/catalog";
import { contracts } from "@/lib/i18n/fr/contracts";
import { network } from "@/lib/i18n/fr/network";
import { listLibraryFiles } from "@/lib/library/queries";
import { listNetworkContacts } from "@/lib/network/queries";
import { projectKindLabel } from "@/lib/projects/labels";
import { progressLabel } from "@/lib/projects/progress";
import { listProjects } from "@/lib/projects/queries";
import { csv, type CsvCell } from "@/lib/utils/csv";
import { formatDay } from "@/lib/utils/day";

// The lists PO exports as CSV (export_list, docs/ASSISTANT.md § 3 sexies).
// Each read with the viewer's session, as its page reads it: RLS decides
// what is in the file. Finance's lists are Finance's « Export comptable ».

export const CATALOG_LISTS = [
  "titres",
  "artistes",
  "projets",
  "contacts",
  "contrats",
  "fichiers",
] as const;
export const EXPORT_LISTS = [...CATALOG_LISTS, ...EXPORT_TYPES] as const;
export type ExportList = (typeof EXPORT_LISTS)[number];

const isFinance = (list: ExportList): list is ExportType =>
  (EXPORT_TYPES as readonly string[]).includes(list);

const c = assistantShow.files.columns;
const day = (value: string | null) =>
  value ? formatDay(value, { weekday: false }) : null;

type Rows = { header: string[]; rows: CsvCell[][] } | null;

async function catalogRows(list: ExportList): Promise<Rows> {
  switch (list) {
    case "titres": {
      const { masters, error } = await listMasters();
      if (error) return null;
      return {
        header: [c.title, c.artists, c.audio, c.isrc, c.duration],
        rows: masters.map((m) => [
          masterLabel(m),
          m.artists,
          m.audioState ? catalog.audioStates[m.audioState] : null,
          m.isrc ? formatIsrc(m.isrc) : null,
          m.durationSeconds === null ? null : formatDuration(m.durationSeconds),
        ]),
      };
    }
    case "artistes": {
      const { artists, error } = await listArtists();
      if (error) return null;
      return {
        header: [c.name, c.relation, c.title, c.projects],
        rows: artists.map((a) => [
          a.name,
          catalog.relation.labels[a.relation],
          a.masterCount,
          a.projectIds.length,
        ]),
      };
    }
    case "projets": {
      const { projects } = await listProjects();
      return {
        header: [c.title, c.artists, c.type, c.stage, c.manager, c.dueOn],
        rows: projects.map((p) => [
          p.title,
          p.artistName || null,
          projectKindLabel(p),
          p.currentStage ? progressLabel(p.currentStage) : null,
          p.responsibleName,
          day(p.dueDate),
        ]),
      };
    }
    case "contacts": {
      const rows = await listNetworkContacts(false);
      if (!rows) return null;
      return {
        header: [c.name, c.type, c.roles, c.organization, c.email, c.phone],
        rows: rows.map((r) => [
          r.name,
          network.kinds[r.kind],
          r.roles
            .map((role) => network.roles[role as keyof typeof network.roles])
            .filter(Boolean)
            .join(", "),
          r.parentName,
          r.email,
          r.phone,
        ]),
      };
    }
    case "contrats": {
      const rows = await listContracts();
      if (!rows) return null;
      return {
        header: [c.contract, c.project, c.artists, c.parties, c.state, c.dueOn],
        rows: rows.map((r) => [
          r.title,
          r.projectTitle,
          r.artistName,
          r.parties.join(", "),
          contracts.states[r.state],
          day(r.dueOn),
        ]),
      };
    }
    case "fichiers": {
      const { files, error } = await listLibraryFiles();
      if (error) return null;
      return {
        header: [c.file, c.category, c.attachedTo, c.addedOn],
        rows: files.map((f) => [
          f.fileName,
          f.categoryLabel,
          f.ownerLabel,
          day(f.createdAt),
        ]),
      };
    }
    default:
      return null;
  }
}

/** Who may export a list: Finance's need read_finance, the rest RLS. */
export function mayExport(access: Access, list: ExportList): boolean {
  return isFinance(list) ? can(access, "read_finance") : true;
}

/** The list as CSV and its line count; null when its read failed. */
export async function listCsv(
  list: ExportList,
  today: string,
): Promise<{ body: string; count: number } | null> {
  if (isFinance(list)) {
    const body = await financeCsv(list, today);
    // Its header line, then one per record.
    return { body, count: Math.max(body.trim().split("\r\n").length - 1, 0) };
  }
  const read = await catalogRows(list);
  if (!read) return null;
  return {
    body: csv([read.header, ...read.rows]),
    count: read.rows.length,
  };
}
