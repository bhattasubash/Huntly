'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, Eye, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

interface OpportunitiesClientProps {
  opportunities: any[];
  projects: any[];
}

export default function OpportunitiesListClient({
  opportunities,
  projects,
}: OpportunitiesClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Get unique list of intent types from opportunities
  const intentTypes = Array.from(new Set(opportunities.map((o) => o.intent_type)));

  // Filter items
  const filtered = opportunities
    .filter((opp) => {
      if (statusFilter !== 'all' && opp.status !== statusFilter) return false;
      if (projectFilter !== 'all' && opp.project_id !== projectFilter) return false;
      if (intentFilter !== 'all' && opp.intent_type !== intentFilter) return false;
      if (
        search &&
        !opp.title.toLowerCase().includes(search.toLowerCase()) &&
        !opp.subreddit.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.priority_score - a.priority_score); // Sort by highest priority

  const getPriorityBadgeClass = (score: number) => {
    if (score >= 85) return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (score >= 70) return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    return 'bg-zinc-500/10 text-muted-foreground border border-border';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
      case 'reviewing':
        return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/15 text-green-400 border border-green-500/20';
      case 'dismissed':
        return 'bg-zinc-500/15 text-muted-foreground border border-border';
      case 'posted':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-secondary text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          Monitor conversations, audit intent matching, and take action on leads.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="glass p-5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Status filter tabs */}
          {['all', 'new', 'reviewing', 'approved', 'dismissed', 'posted'].map((status) => (
            <button
              id={`opp-filter-${status}-btn`}
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-all ${
                statusFilter === status
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or sub..."
            className="px-3.5 py-2.5 bg-secondary/50 rounded-xl border border-border text-xs text-white outline-none w-full md:w-44 focus:border-primary/50"
          />

          {/* Project filter dropdown */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-secondary/50 rounded-xl border border-border text-xs text-white outline-none w-full md:w-auto cursor-pointer focus:border-primary/50"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.company_name}
              </option>
            ))}
          </select>

          {/* Intent filter dropdown */}
          <select
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-secondary/50 rounded-xl border border-border text-xs text-white outline-none w-full md:w-auto cursor-pointer focus:border-primary/50"
          >
            <option value="all">All Intent Types</option>
            {intentTypes.map((it) => (
              <option key={it} value={it}>
                {it.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((opp) => {
            const project = projects.find((p) => p.id === opp.project_id);
            return (
              <div
                key={opp.id}
                className="glass p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 premium-card hover:bg-secondary/20"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-accent border border-primary/20">
                      {project?.company_name || 'Project'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/80 text-muted-foreground">
                      r/{opp.subreddit}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground border border-border/50">
                      {opp.intent_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(opp.status)}`}>
                      {opp.status}
                    </span>
                    {opp.user_feedback && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {opp.user_feedback.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <h4 className="text-md font-bold text-white max-w-xl md:truncate">{opp.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">{opp.opportunity_summary}</p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-none border-border/50 pt-3 md:pt-0">
                  <span className="text-[10px] text-muted-foreground font-semibold md:hidden">Created {new Date(opp.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-6 shrink-0 ml-auto md:ml-0">
                    <div className="text-center pr-2">
                      <div className={`text-xl font-black px-2.5 py-0.5 rounded-lg ${getPriorityBadgeClass(opp.priority_score)}`}>
                        {opp.priority_score}
                      </div>
                      <div className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">Priority</div>
                    </div>
                    <Link
                      id={`opp-view-${opp.id}-btn`}
                      href={`/dashboard/opportunities/${opp.id}`}
                      className="px-4 py-2.5 bg-secondary hover:bg-primary/20 hover:text-white rounded-xl text-xs font-bold text-muted-foreground transition-all flex items-center gap-1"
                    >
                      Review <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass p-16 rounded-3xl text-center space-y-4">
            <p className="text-muted-foreground text-sm">No opportunities matched your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
