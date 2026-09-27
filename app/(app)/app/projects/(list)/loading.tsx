import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function ProjectsLoading() {
  return (
    <PageLoading
      title={fr.shell.projects.title}
      description={fr.shell.projects.subtitle}
    />
  );
}
