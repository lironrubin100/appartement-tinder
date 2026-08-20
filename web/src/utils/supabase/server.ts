import { createServerComponentClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createServerComponentClient<Database>(
    { cookies: () => cookieStore },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  );
}
