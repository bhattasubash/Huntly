import { createServerSideClient } from '@/lib/supabase/server';
import OpportunitiesListClient from './opportunities-client';

export const revalidate = 0; // Fresh list on load

export default async function OpportunitiesPage() {
  const supabase = await createServerSideClient();
  
  const { data: opportunities = [] } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: projects = [] } = await supabase
    .from('projects')
    .select('*');

  return (
    <OpportunitiesListClient
      opportunities={opportunities || []}
      projects={projects || []}
    />
  );
}
