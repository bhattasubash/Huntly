import { createServerSideClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import OpportunityClient from './opportunity-client';

export const revalidate = 0; // Fresh details on load

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSideClient();

  // Fetch opportunity (RLS automatically filters by tenant user_id)
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single();

  if (oppError || !opportunity) {
    notFound();
  }

  // Fetch project context
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', opportunity.project_id)
    .single();

  return <OpportunityClient opportunity={opportunity} project={project} />;
}
