// ============================================================
//  src/db.ts — Reusable database access helpers
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project } from './types';
import 'dotenv/config';

let clientInstance: SupabaseClient | null = null;

/**
 * Initializes and returns a cached Supabase Client using the Service Role Key.
 * Bypasses Row-Level Security (RLS) for server-side tasks.
 */
export function initSupabaseClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
    );
  }

  clientInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return clientInstance;
}

/**
 * Inserts a new project into public.projects.
 *
 * @param projectData - Project row fields (excluding generated fields: id, created_at)
 * @returns The inserted Project row.
 */
export async function insertProject(
  projectData: Omit<Project, 'id' | 'created_at'>
): Promise<Project> {
  const supabase = initSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .insert([projectData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert project: ${error.message}`);
  }

  if (!data) {
    throw new Error('Project insertion completed, but no data was returned.');
  }

  return data as Project;
}

/**
 * Fetches all projects from the database.
 */
export async function getAllProjects(): Promise<Project[]> {
  const supabase = initSupabaseClient();
  const { data, error } = await supabase.from('projects').select('*');

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return (data ?? []) as Project[];
}
