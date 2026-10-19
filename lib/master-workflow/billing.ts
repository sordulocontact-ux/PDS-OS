import "server-only";

import { createClient } from "@/lib/supabase/server";

// The organization's billing identity (« Facturer à » on an engineer's
// link), written by the administration in /app/settings.

export type Billing = {
  legalName: string;
  address: string;
  siret: string | null;
  vat: string | null;
};

export async function loadBilling(
  organizationId: string,
): Promise<Billing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_billing")
    .select("legal_name, address, siret, vat_number")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) console.error("loadBilling:", error.message);
  return data
    ? {
        legalName: data.legal_name,
        address: data.address,
        siret: data.siret,
        vat: data.vat_number,
      }
    : null;
}
