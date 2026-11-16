import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function FeedbackLoading() {
  return <PageLoading title={fr.feedback.title} section list />;
}
