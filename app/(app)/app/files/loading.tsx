import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function FilesLoading() {
  return (
    <PageLoading
      title={fr.library.title}
      description={fr.library.description}
      section
      list
    />
  );
}
