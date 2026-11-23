import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function MailLoading() {
  return <PageLoading title={fr.mailbox.title} section list />;
}
