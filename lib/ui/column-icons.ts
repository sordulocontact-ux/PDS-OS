import {
  IconAtSign,
  IconBox2,
  IconCalendarDays,
  IconCalendarStar,
  IconCircleHalfDottedCheck,
  IconClipboardCheck,
  IconFile,
  IconFolderOpen,
  IconGauge3,
  IconHandshake,
  IconLayers,
  IconLayers3,
  IconLocation2,
  IconMicrophone,
  IconMsgPen2,
  IconNodes,
  IconPaperclip,
  IconPenWriting2,
  IconPenWriting4,
  IconPhone,
  IconProgressBar,
  IconRoadmap,
  IconScale,
  IconSparkle3,
  IconSuitcase5,
  IconTag,
  IconTasks2,
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
  release: IconCalendarStar,
  updated: IconPenWriting2,
  priority: IconGauge3,
  kind: IconTag,
  format: IconLayers,
  // What a file belongs to, and which kind of record it is.
  attached: IconPaperclip,
  source: IconLayers3,
  size: IconBox2,
  audio: IconVolumeUp,
  ongoing: IconProgressBar,
  ai: IconSparkle3,
  // Contact details.
  email: IconAtSign,
  phone: IconPhone,
  city: IconLocation2,
} as const;

export type ColumnIcon = keyof typeof columnIcons;
