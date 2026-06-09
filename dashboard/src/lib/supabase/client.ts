import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for use in Browser / Client Components.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn("Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. Using a fallback proxy client.");
    const handler = {
      get: (target: any, prop: string): any => {
        if (prop === 'then') {
          return (resolve: any) => resolve({ data: null, error: new Error("Supabase not configured"), count: 0 });
        }
        return () => new Proxy({}, handler);
      }
    };
    return new Proxy({}, handler) as unknown as SupabaseClient;
  }

  return createBrowserClient(url, anonKey);
}
