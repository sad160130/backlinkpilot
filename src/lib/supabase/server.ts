import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function createClient(): SupabaseClient {
  const cookieStore = cookies();

  const storage = {
    getItem: (key: string): string | null => {
      return cookieStore.get(key)?.value ?? null;
    },
    setItem: (_key: string, _value: string): void => {
      // Server components cannot mutate cookies. Writes are no-ops here;
      // session refresh is handled by the route handler / client.
    },
    removeItem: (_key: string): void => {
      // No-op (see above).
    },
  };

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage,
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    }
  );
}
