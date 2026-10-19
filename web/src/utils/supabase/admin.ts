import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Supabase server key is not set");
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key
  );
}
