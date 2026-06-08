import { createServerSideClient } from '@/lib/supabase/server';
import { Flame, FolderGit2, Send, ThumbsUp, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Fresh metrics on load

export default async function DashboardOverview() {
  const supabase = await createServerSideClient();

  // Load Projects & Opportunities
  const { data: projects = [] } = await supabase.from('projects').select('*');
  const { data: opportunities = [] } = await supabase.from('opportunities').select('*');

  const totalProjects = projects?.length ?? 0;
  const totalOpportunities = opportunities?.length ?? 0;
  
  // Stats calculations
  const pendingOpportunities = opportunities?.filter((o) => o.status === 'new' || o.status === 'reviewing') ?? [];
  const approvedOpportunities = opportunities?.filter((o) => o.status === 'approved' || o.status === 'posted') ?? [];
  
  const feedbackOpportunities = opportunities?.filter((o) => o.user_feedback !== null) ?? [];
  const positiveFeedback = feedbackOpportunities.filter((o) => o.user_feedback === 'good_lead' || o.user_feedback === 'converted').length;
  const feedbackRate = feedbackOpportunities.length > 0 
    ? Math.round((positiveFeedback / feedbackOpportunities.length) * 100) 
    : 0;

  // Filter high-priority opportunities (sorted by score desc)
  const highPriorityPending = pendingOpportunities
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Page Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Workspace Overview</h1>
        <p className="text-sm text-muted-foreground">Monitor performance, audit incoming leads, and manage your Reddit listening signals.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="glass p-6 rounded-2xl flex items-center justify-between premium-card">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Projects</span>
            <div className="text-3xl font-extrabold text-white">{totalProjects}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <FolderGit2 className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass p-6 rounded-2xl flex items-center justify-between premium-card">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opportunities Detected</span>
            <div className="text-3xl font-extrabold text-white">{totalOpportunities}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
            <Flame className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass p-6 rounded-2xl flex items-center justify-between premium-card">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Awaiting Review</span>
            <div className="text-3xl font-extrabold text-white">{pendingOpportunities.length}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass p-6 rounded-2xl flex items-center justify-between premium-card">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead Quality Feedback</span>
            <div className="text-3xl font-extrabold text-white">{feedbackRate}% <span className="text-xs font-medium text-muted-foreground">Pos.</span></div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <ThumbsUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* High Priority Pending Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white tracking-tight">Top Priority Pending Leads</h3>
            <Link href="/dashboard/opportunities" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {highPriorityPending.length > 0 ? (
              highPriorityPending.map((opp) => {
                const project = projects?.find((p) => p.id === opp.project_id);
                return (
                  <div key={opp.id} className="glass p-5 rounded-2xl flex justify-between items-center premium-card hover:bg-secondary/20">
                    <div className="space-y-2 min-w-0 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-accent border border-primary/20">
                          {project?.company_name || 'Project'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/80 text-muted-foreground">
                          r/{opp.subreddit}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300">
                          {opp.intent_type.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-md font-bold text-white truncate max-w-xl">{opp.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{opp.opportunity_summary}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center pr-2">
                        <div className="text-2xl font-black text-white">{opp.priority_score}</div>
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Score</div>
                      </div>
                      <Link
                        id={`overview-view-lead-${opp.id}-btn`}
                        href={`/dashboard/opportunities/${opp.id}`}
                        className="p-3 bg-secondary hover:bg-primary/20 hover:text-white rounded-xl text-muted-foreground transition-all"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="glass p-12 rounded-2xl text-center space-y-4">
                <p className="text-muted-foreground">No pending opportunities found.</p>
                {totalProjects === 0 && (
                  <Link href="/dashboard/projects" className="inline-block px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm">
                    Create a Project to Start
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Column */}
        <div className="glass p-6 rounded-2xl space-y-6 flex flex-col justify-between h-fit">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-border/50 pb-2">Active Listening Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Target Projects</span>
                <span className="font-semibold text-white">{totalProjects}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Scanned Leads</span>
                <span className="font-semibold text-white">{totalOpportunities}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Telegram Alerts</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase">Enabled</span>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-border/50 text-xs text-muted-foreground leading-relaxed">
            💡 <strong>Pro Tip:</strong> Reddit feeds are fetched periodically. Keep your projects updated with exact keywords to maximize matching precision.
          </div>
        </div>
      </div>
    </div>
  );
}
