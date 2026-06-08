import { createServerSideClient } from '@/lib/supabase/server';
import ProjectsClient from './projects-client';

export const revalidate = 0; // Fresh list on load

export default async function ProjectsPage() {
  const supabase = await createServerSideClient();
  
  const { data: projects = [] } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  return <ProjectsClient initialProjects={projects || []} />;
}
