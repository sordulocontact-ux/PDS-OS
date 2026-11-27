import {
  IconAtSign,
  IconBookmark,
  IconBox2,
  IconCalendarDays,
  IconCalendarStar,
  IconChartBarAxisX,
  IconCircleHalfDottedCheck,
  IconClipboard,
  IconClipboardCheck,
  IconDiscount,
  IconFile,
  IconFolderOpen,
  IconGauge3,
  IconHandshake,
  IconLayers,
  IconLayers3,
  IconLink,
  IconLocation2,
  IconMicrophone,
  IconMoneyBillCoin,
  IconMsgPen2,
  IconNodes,
  IconPaperPlane2,
  IconPaperclip,
  IconPenWriting2,
  IconPenWriting4,
  IconPhone,
  IconProgressBar,
  IconRoadmap,
  IconScale,
  IconSliders,
  IconSparkle3,
  IconSuitcase5,
  IconTarget,
  IconTag,
  IconTasks2,
  IconTimer2,
  IconUser,
  IconUsers2,
  IconUsersHeart,
  IconVolumeUp,
} from "nucleo-sharp-essential";

import { IconDisc } from "@/components/icons";

// The icon before a table column's name (`DataTableHead icon`), by what the
// column holds, so one kind of column wears one icon in every table
// (« Responsable » in Projets, Contrats, Deals…). A record's own column
// (Projet, Artiste, Contrat…) wears its icon of the navigation
// (lib/ui/nav-items.ts). Trial of Sacha, 25/11/2026.
export const columnIcons = {
  // Records, as in the navigation.
  project: IconFolderOpen,
  artist: IconMicrophone,
  master: IconDisc,
  contact: IconNodes,
  contract: IconHandshake,
  deal: IconScale,
  call: IconPhone,
  session: IconSliders,
  notes: IconPenWriting4,
  file: IconFile,
  // People.
  person: IconUser,
  people: IconUsers2,
  role: IconSuitcase5,
  relation: IconUsersHeart,
  // Facts.
  status: IconCircleHalfDottedCheck,
  step: IconRoadmap,
  next: IconTasks2,
  decision: IconClipboardCheck,
  note: IconMsgPen2,
  date: IconCalendarDays,
  hours: IconTimer2,
  place: IconLocation2,
  release: IconCalendarStar,
  updated: IconPenWriting2,
  priority: IconGauge3,
  kind: IconTag,
  format: IconLayers,
  // A share of a deal (« Taux », the master's split).
  rate: IconDiscount,
  // A fiche de renseignements (its state).
  fiche: IconClipboard,
  // A release's deposit (Distribution).
  distribution: IconPaperPlane2,
  // What a file belongs to, and which kind of record it is.
  attached: IconPaperclip,
  source: IconLayers3,
  size: IconBox2,
  audio: IconVolumeUp,
  ongoing: IconProgressBar,
  ai: IconSparkle3,
  // Money (a price, a budget, an amount spent, what is left).
  amount: IconMoneyBillCoin,
  // A figure measured or counted (a KPI, a metric, declared vs verified).
  metric: IconChartBarAxisX,
  // What a figure aims at (an objective, a KPI's target).
  target: IconTarget,
  // A link to another record or a page.
  link: IconLink,
  // A named line of a budget, a plan or a list (post, envelope, lever, item).
  item: IconBookmark,
  // Contact details.
  email: IconAtSign,
  phone: IconPhone,
  city: IconLocation2,
} as const;

export type ColumnIcon = keyof typeof columnIcons;
