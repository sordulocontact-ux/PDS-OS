import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";

// The templates are a tab of the Contrats page (Sacha, 30/10/2026).
export default function ContractTemplatesPage() {
  redirect(routes.contractTemplateList);
}
