import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function MembersLoading() {
  return (
    <PageLoading
      title={fr.auth.members.title}
      description={fr.auth.members.subtitle}
      section
      list
    />
  );
}
