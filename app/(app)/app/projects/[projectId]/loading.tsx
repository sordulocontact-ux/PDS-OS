import { ProjectSectionLoading } from "@/components/projects/project-section-loading";

// Every section of a launched project (Travail, Budget, Calls…): the project
// header and sidebars stay while the section loads.
export default function ProjectSectionLoadingPage() {
  return <ProjectSectionLoading />;
}
