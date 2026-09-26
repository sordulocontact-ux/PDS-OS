import Link from "next/link";

import { StageStateBadge } from "@/components/projects/stage-state-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ProjectListItem } from "@/lib/projects/types";
import { projectStatusTreatment } from "@/lib/ui/state-treatments";

export function ProjectsTable({ projects }: { projects: ProjectListItem[] }) {
  const t = fr.shell.projects;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.columns.title}</TableHead>
          <TableHead>{t.columns.artist}</TableHead>
          <TableHead>{t.columns.type}</TableHead>
          <TableHead>{t.columns.stage}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id} className="relative">
            <TableCell className="font-medium">
              {/* The title link covers the whole row (after: pseudo-element). */}
              <Link
                href={routes.project(project.id)}
                className="outline-none after:absolute after:inset-0 focus-visible:underline"
              >
                {project.title}
              </Link>
            </TableCell>
            <TableCell>{project.artistName}</TableCell>
            <TableCell>{fr.shell.projectTypes[project.type]}</TableCell>
            <TableCell>
              {project.currentStage ? (
                <span className="flex flex-wrap items-center gap-2">
                  {project.currentStage.label}
                  <StageStateBadge state={project.currentStage.state} />
                </span>
              ) : project.stageCount > 0 ? (
                <span>{t.allValidated}</span>
              ) : (
                <StatusBadge
                  treatment={projectStatusTreatment[project.status]}
                  size="sm"
                >
                  {fr.transmission.statuses[project.status]}
                </StatusBadge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
