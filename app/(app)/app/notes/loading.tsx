import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function NotesLoading() {
  return <PageLoading title={fr.notes.title} section list />;
}
