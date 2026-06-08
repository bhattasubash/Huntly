'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOpportunityStatus } from '../opportunities/[id]/actions';
import { Clipboard, Check, Send, Trash, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ReplyQueueClientProps {
  opportunities: any[];
  projects: any[];
}

export default function ReplyQueueClient({ opportunities, projects }: ReplyQueueClientProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Filter approved or posted opportunities
  const queue = opportunities.filter((o) => o.status === 'approved' || o.status === 'posted');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusUpdate = async (id: string, status: 'posted' | 'dismissed') => {
    setLoadingId(id);
    const res = await updateOpportunityStatus(id, status);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to update status.');
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Reply Queue</h1>
        <p className="text-sm text-muted-foreground">
          View approved replies awaiting posting on Reddit, or log historical posted replies.
        </p>
      </div>

      {/* Reply Queue List */}
      <div className="space-y-4">
        {queue.length > 0 ? (
          queue.map((opp) => {
            const project = projects.find((p) => p.id === opp.project_id);
            const replyText = opp.custom_reply || opp.selected_reply || 
              (opp.suggested_replies && opp.suggested_replies[0]?.reply) || 'No reply text';

            return (
              <div key={opp.id} className="glass p-6 rounded-2xl space-y-4 premium-card">
                {/* Header detail */}
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-accent border border-primary/20">
                        {project?.company_name || 'Project'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        r/{opp.subreddit}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        opp.status === 'approved' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {opp.status}
                      </span>
                    </div>
                    <h3 className="text-md font-bold text-white mt-1 leading-tight">{opp.title}</h3>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`https://www.reddit.com${opp.permalink}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-white rounded-xl border border-border transition-all flex items-center justify-center cursor-pointer"
                      title="Open Reddit Thread"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Link
                      href={`/dashboard/opportunities/${opp.id}`}
                      className="p-2.5 bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-white rounded-xl border border-border transition-all flex items-center justify-center"
                      title="View Details"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* Approved Reply Text Box */}
                <div className="p-4 bg-secondary/35 rounded-xl border border-border/50 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                    <span>Approved Reply Text</span>
                    <button
                      onClick={() => handleCopy(opp.id, replyText)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === opp.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Clipboard className="h-3.5 w-3.5" /> Copy Text
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{replyText}</p>
                </div>

                {/* Quick actions for queue */}
                {opp.status === 'approved' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleStatusUpdate(opp.id, 'posted')}
                      disabled={loadingId === opp.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Mark as Posted
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(opp.id, 'dismissed')}
                      disabled={loadingId === opp.id}
                      className="px-4 py-2 bg-secondary hover:bg-destructive/10 hover:text-destructive border border-border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash className="h-3.5 w-3.5" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="glass p-16 rounded-3xl text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              Your reply queue is empty. Go to Opportunities to review and approve drafts.
            </p>
            <Link
              href="/dashboard/opportunities"
              className="inline-block px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs"
            >
              Review Opportunities
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
