import { PageLoading } from "@/components/shell/page-loading";
import { sessions } from "@/lib/i18n/fr/sessions";

export default function SessionsLoading() {
  return (
    <PageLoading
      title={sessions.title}
      description={sessions.subtitle}
      section
      list
    />
  );
}
