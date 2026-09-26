import { NextResponse } from "next/server";

import { fetchAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

// Returns the access state and role of the signed-in account, nothing else:
// no business data goes through here. Polled by screens so that a decision
// taken elsewhere takes effect without a reload. The role matters as much as
// the state: a demoted admin stays "approved" but must leave the team screen.

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const access = await fetchAccess(supabase);

  return NextResponse.json(
    { state: access.state, role: access.role },
    { headers: { "Cache-Control": "no-store" } },
  );
}
