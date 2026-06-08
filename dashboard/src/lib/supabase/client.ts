import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for use in Browser / Client Components.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window === 'undefined') {
      const handler = {
        get: (target: any, prop: string): any => {
          if (prop === 'then') {
            return (resolve: any) => resolve({ data: null, error: null, count: 0 });
          }
          return () => new Proxy({}, handler);
        }
      };
      return new Proxy({}, handler) as unknown as SupabaseClient;
    }
    throw new Error("Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.");
  }

  return createBrowserClient(url, anonKey);
}
