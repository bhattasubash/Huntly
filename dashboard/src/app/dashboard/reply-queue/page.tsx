import { createServerSideClient } from '@/lib/supabase/server';
import ReplyQueueClient from './reply-queue-client';

export const revalidate = 0; // Fresh list on load

export default async function ReplyQueuePage() {
  const supabase = await createServerSideClient();
  
  const { data: opportunities = [] } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: projects = [] } = await supabase
    .from('projects')
    .select('*');

  return (
    <ReplyQueueClient
      opportunities={opportunities || []}
      projects={projects || []}
    />
  );
}
