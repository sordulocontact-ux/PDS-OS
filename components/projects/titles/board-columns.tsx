import type { ReactNode } from "react";

import {
  DistributionCell,
  Empty,
  MixCell,
  ReleaseCell,
  SECONDARY,
  Text,
  TitleCell,
} from "@/components/projects/titles/board-cells";
import type {
  BoardLinks,
  BoardRow,
} from "@/components/projects/titles/board-rows";
import {
  AccordStage,
  ContactStatePill,
  ContractFacts,
  FichePill,
  muted,
} from "@/components/projects/titles/recap-facts";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { TitleRecap } from "@/lib/projects/recap-rules";
import type { ColumnIcon } from "@/lib/ui/column-icons";

// The columns of « Titres » par artiste after Artiste, the columns of Ibé's
// Excel (Sacha 27/11/2026: one fact a column with its icon, every state a
// dot and its word, nothing edited in a cell), shared by the board's table
// and phone cards (TitlesBoard) and the overview's compact recap
// (TitlesRecapCompact): the same cells, the same states. Each cell says one
// thing on one line; a state opens its module. No hook: rendered on the
// server too.

const fr = { projectTitles };

type Hide = "sm" | "md" | "lg" | "xl" | "2xl";

export type BoardColumn = {
  key: string;
  label: string;
  icon: ColumnIcon;
  // The compact recap only: hidden under a breakpoint (the board scrolls
  // sideways instead, nothing hidden).
  hideBelow?: Hide;
  // Shares what is left of the width (the compact recap's title).
  fill?: boolean;
  // Its width, on the head and each cell, wide enough for its head (icon,
  // label, sort arrow) never to be cut; its text cut instead. Literal
  // classes: Tailwind only generates what it reads in full.
  className: string;
  cell: (row: BoardRow) => ReactNode;
};

const W = {
  role: "w-32 min-w-32 max-w-32",
  title: "w-64 min-w-64 max-w-64",
  status: "w-36 min-w-36 max-w-36",
  contact: "w-44 min-w-44 max-w-44",
  phone: "w-40 min-w-40 max-w-40",
  accord: "w-44 min-w-44 max-w-44",
  rate: "w-28 min-w-28 max-w-28",
  fiche: "w-36 min-w-36 max-w-36",
  contract: "w-36 min-w-36 max-w-36",
  mix: "w-40 min-w-40 max-w-40",
  release: "w-32 min-w-32 max-w-32",
  distribution: "w-44 min-w-44 max-w-44",
  beatmaker: "w-44 min-w-44 max-w-44",
  note: "w-64 min-w-64 max-w-64",
} as const;

// The names of the compact recap (Artiste, Titre) share what is left, cut
// rather than widening the table (`max-w-0`), never narrower than a name.
export const NAME_COLUMN = "min-w-36 max-w-0";

/**
 * The columns after Artiste, as the reader may read them. The board:
 * Rôle when the rows do not all have the same (`roles`), Titre, Statut,
 * Contact, Téléphone, Accord and Taux when the reader sees deals, Fiche and
 * Contrat with manage_legal, Mix, Sortie, Distribution once the project has
 * the workflow (`links.distribution`), Beatmaker, Notes (`notes`, none on
 * an overview). The compact recap (`compact`): Titre (none on a title's
 * page, `title` false), Statut, Accord, Fiche, Contrat, Mix, hidden under
 * a breakpoint.
 */
export function boardColumns({
  recap,
  projectId,
  links,
  roles = false,
  title = true,
  notes = false,
  compact = false,
}: {
  recap: Pick<TitleRecap, "dealReach" | "canReadLegal">;
  projectId: string;
  links: BoardLinks;
  roles?: boolean;
  title?: boolean;
  notes?: boolean;
  compact?: boolean;
}): BoardColumn[] {
  const c = fr.projectTitles.recap.columns;
  const t = fr.projectTitles;
  const accord = recap.dealReach !== "none";
  const legal = recap.canReadLegal;
  const board = !compact;
  const columns: (BoardColumn | false)[] = [
    roles && {
      key: "role",
      label: c.role,
      icon: "role",
      className: W.role,
      cell: ({ participation: p }) => (
        <Text className={SECONDARY}>{p && t.participations.roles[p.role]}</Text>
      ),
    },
    title && {
      key: "title",
      label: c.title,
      icon: "master",
      hideBelow: compact ? "md" : undefined,
      fill: compact,
      className: compact ? NAME_COLUMN : W.title,
      cell: (row) => (
        <TitleCell row={row} projectId={projectId} links={links} />
      ),
    },
    {
      key: "status",
      label: c.status,
      icon: "status",
      hideBelow: compact ? "sm" : undefined,
      className: W.status,
      cell: ({ participation: p }) =>
        p ? <ContactStatePill status={p.status} /> : <Empty />,
    },
    board && {
      key: "contact",
      label: c.contact,
      icon: "contact",
      className: W.contact,
      cell: ({ participation: p }) => <Text>{p?.recap.contact?.name}</Text>,
    },
    board && {
      key: "phone",
      label: c.phone,
      icon: "phone",
      className: W.phone,
      cell: ({ participation: p }) =>
        p?.recap.contact?.hidden ? (
          <Text className={muted}>{t.recap.contact.hidden}</Text>
        ) : (
          <Text className={SECONDARY}>{p?.recap.contact?.phone}</Text>
        ),
    },
    accord && {
      key: "accord",
      label: c.accord,
      icon: "deal",
      hideBelow: compact ? "xl" : undefined,
      className: W.accord,
      cell: ({ participation: p }) =>
        p?.recap.accord ? (
          <AccordStage accord={p.recap.accord} artist={p.artist.name} />
        ) : (
          <Empty />
        ),
    },
    accord &&
      board && {
        key: "rate",
        label: c.rate,
        icon: "rate",
        className: W.rate,
        cell: ({ participation: p }) => (
          <Text className={SECONDARY}>{p?.recap.accord?.rate}</Text>
        ),
      },
    legal && {
      key: "fiche",
      label: c.ficheShort,
      icon: "fiche",
      hideBelow: compact ? "xl" : undefined,
      className: W.fiche,
      cell: ({ participation: p }) =>
        p?.recap.fiche ? (
          <FichePill fiche={p.recap.fiche} name={p.artist.name} />
        ) : (
          <Empty />
        ),
    },
    legal && {
      key: "contract",
      label: c.contract,
      icon: "contract",
      hideBelow: compact ? "xl" : undefined,
      className: W.contract,
      cell: ({ participation: p }) =>
        p?.recap.contract ? (
          <ContractFacts contract={p.recap.contract} />
        ) : (
          <Empty />
        ),
    },
    {
      key: "mix",
      label: c.mix,
      icon: "audio",
      hideBelow: compact ? "xl" : undefined,
      className: W.mix,
      cell: (row) => <MixCell row={row} links={links} />,
    },
    board && {
      key: "release",
      label: c.release,
      icon: "release",
      className: W.release,
      cell: (row) => <ReleaseCell row={row} />,
    },
    board &&
      links.distribution !== null && {
        key: "distribution",
        label: c.distribution,
        icon: "distribution",
        className: W.distribution,
        cell: (row) => <DistributionCell row={row} links={links} />,
      },
    board && {
      key: "beatmaker",
      label: c.beatmaker,
      icon: "people",
      className: W.beatmaker,
      cell: ({ title: tt }) => (
        <Text className={SECONDARY}>
          {tt.recap.beatmakers.map((person) => person.name).join(", ")}
        </Text>
      ),
    },
    board &&
      notes && {
        key: "note",
        label: c.note,
        icon: "note",
        className: W.note,
        cell: ({ participation: p }) => (
          <Text className={SECONDARY}>{p?.recap.note}</Text>
        ),
      },
  ];
  return columns.filter((column) => column !== false);
}
