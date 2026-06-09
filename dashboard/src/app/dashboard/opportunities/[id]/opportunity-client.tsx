'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markAsViewed, updateOpportunityStatus, submitFeedback } from './actions';
import { 
  ArrowLeft, Flame, ExternalLink, Clipboard, CheckCircle2, 
  ThumbsUp, ThumbsDown, ShieldAlert, BadgeCheck, Eye, Clock, 
  Check, Trash, AlertTriangle, Send, Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface OpportunityClientProps {
  opportunity: any;
  project: any;
}

export default function OpportunityClient({ opportunity, project }: OpportunityClientProps) {
  const router = useRouter();

  // Selected reply draft state
  const [draftIndex, setDraftIndex] = useState<number>(0);
  const [editedReply, setEditedReply] = useState<string>('');
  const [isCustomReply, setIsCustomReply] = useState(false);
  const [customReplyText, setCustomReplyText] = useState('');

  // Status and feedback states
  const [status, setStatus] = useState<string>(opportunity.status);
  const [feedback, setFeedback] = useState<string | null>(opportunity.user_feedback);
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trigger viewed_at timestamp on mount
  useEffect(() => {
    markAsViewed(opportunity.id).then((res) => {
      if (res.success) {
        router.refresh(); // Refresh to pull viewed_at down if it was updated
      }
    });
  }, [opportunity.id, router]);

  // Set default edited text when switching drafts
  useEffect(() => {
    if (!isCustomReply && opportunity.suggested_replies && opportunity.suggested_replies[draftIndex]) {
      setEditedReply(opportunity.suggested_replies[draftIndex].reply || '');
    }
  }, [draftIndex, isCustomReply, opportunity.suggested_replies]);

  const handleCopy = () => {
    const textToCopy = isCustomReply ? customReplyText : editedReply;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateStatus = async (newStatus: 'approved' | 'dismissed' | 'posted') => {
    setLoading(true);
    const replyText = isCustomReply ? customReplyText : editedReply;
    const res = await updateOpportunityStatus(
      opportunity.id, 
      newStatus, 
      isCustomReply ? undefined : replyText, 
      isCustomReply ? replyText : undefined
    );

    if (res.success) {
      setStatus(newStatus);
      router.refresh();
    } else {
      alert(res.error || 'Failed to update status.');
    }
    setLoading(false);
  };

  const handleFeedback = async (type: 'good_lead' | 'bad_lead' | 'irrelevant' | 'converted') => {
    setFeedbackLoading(true);
    const res = await submitFeedback(opportunity.id, type);
    if (res.success) {
      setFeedback(type);
      router.refresh();
    } else {
      alert(res.error || 'Failed to log feedback.');
    }
    setFeedbackLoading(false);
  };

  const getPriorityBadgeClass = (score: number) => {
    if (score >= 85) return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (score >= 70) return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    return 'bg-zinc-500/10 text-muted-foreground border border-border';
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Link
          id="detail-back-btn"
          href="/dashboard/opportunities"
          className="p-2.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-muted-foreground hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Opportunity Details</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column: Post info and drafts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Content */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-accent border border-primary/20">
                  r/{opportunity.subreddit}
                </span>
                <h1 className="text-xl lg:text-2xl font-black text-white leading-tight mt-1">{opportunity.title}</h1>
                <p className="text-xs text-muted-foreground">
                  Posted by <span className="font-semibold text-gray-300">u/{opportunity.author}</span>
                </p>
              </div>
              <a
                id="reddit-thread-link"
                href={`https://www.reddit.com${opportunity.permalink}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-secondary hover:bg-primary/20 hover:text-white border border-border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Open Reddit Thread <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {opportunity.selftext && (
              <div className="p-4 bg-secondary/35 rounded-xl border border-border/50 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {opportunity.selftext}
              </div>
            )}
          </div>

          {/* AI Analysis and drafts */}
          <div className="glass p-6 rounded-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Suggested Replies & Drafts
              </h3>
              <div className="flex gap-2">
                <button
                  id="draft-style-ai-btn"
                  onClick={() => setIsCustomReply(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    !isCustomReply ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  AI Suggestions
                </button>
                <button
                  id="draft-style-custom-btn"
                  onClick={() => setIsCustomReply(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    isCustomReply ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  Custom Draft
                </button>
              </div>
            </div>

            {/* AI Drafts selector */}
            {!isCustomReply ? (
              <div className="space-y-4">
                <div className="flex gap-2 border-b border-border/30 pb-2">
                  {opportunity.suggested_replies?.map((replyObj: any, index: number) => (
                    <button
                      id={`draft-tab-${index}-btn`}
                      key={index}
                      onClick={() => setDraftIndex(index)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                        draftIndex === index
                          ? 'bg-secondary text-white border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-white'
                      }`}
                    >
                      Draft {index + 1} ({replyObj.style.replace('_', ' ')})
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <textarea
                    id="draft-edit-textarea"
                    value={editedReply}
                    onChange={(e) => setEditedReply(e.target.value)}
                    rows={6}
                    className="w-full p-4 bg-secondary/50 rounded-xl border border-border text-sm text-white focus:border-primary/50 outline-none resize-y"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      ⚠️ Review and customize before copying to Reddit.
                    </span>
                    <button
                      id="draft-copy-btn"
                      onClick={handleCopy}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-white"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Clipboard className="h-4 w-4" /> Copy Draft
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  id="custom-draft-textarea"
                  value={customReplyText}
                  onChange={(e) => setCustomReplyText(e.target.value)}
                  placeholder="Write your custom Reddit reply here..."
                  rows={6}
                  className="w-full p-4 bg-secondary/50 rounded-xl border border-border text-sm text-white focus:border-primary/50 outline-none resize-y"
                />
                <div className="flex justify-end">
                  <button
                    id="custom-draft-copy-btn"
                    onClick={handleCopy}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Clipboard className="h-4 w-4" /> Copy Draft
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
              <button
                id="opp-approve-btn"
                onClick={() => handleUpdateStatus('approved')}
                disabled={loading || status === 'approved'}
                className="px-5 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <BadgeCheck className="h-4 w-4" /> Approve Draft
              </button>
              <button
                id="opp-posted-btn"
                onClick={() => handleUpdateStatus('posted')}
                disabled={loading || status === 'posted'}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Mark as Posted
              </button>
              <button
                id="opp-dismiss-btn"
                onClick={() => handleUpdateStatus('dismissed')}
                disabled={loading || status === 'dismissed'}
                className="px-5 py-3 bg-secondary hover:bg-destructive/10 hover:text-destructive border border-border font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 ml-auto"
              >
                <Trash className="h-4 w-4" /> Dismiss Lead
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Column: Signal details and feedback */}
        <div className="space-y-6">
          {/* Signal Assessment */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white border-b border-border/50 pb-2">Opportunity Signals</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-secondary/35 rounded-xl border border-border/30 text-center">
                <div className={`text-2xl font-black ${getPriorityBadgeClass(opportunity.priority_score).split(' ')[1]}`}>
                  {opportunity.priority_score}
                </div>
                <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">Priority Score</div>
              </div>

              <div className="p-3 bg-secondary/35 rounded-xl border border-border/30 text-center flex flex-col justify-center items-center">
                <span className="text-xs font-bold text-white uppercase tracking-tight">{opportunity.intent_type.replace('_', ' ')}</span>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">Intent Type</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opportunity Summary</span>
                <p className="text-xs text-white leading-relaxed">{opportunity.opportunity_summary}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎯 Why This Fits</span>
                <p className="text-xs text-white leading-relaxed">{opportunity.fit_reason}</p>
              </div>
            </div>
          </div>

          {/* Lead Quality Feedback System */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white border-b border-border/50 pb-2">Lead Quality Feedback</h3>
            <p className="text-xs text-muted-foreground">
              Rate this lead to help tune future Huntly intent analysis and prioritization weights.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="feedback-good-btn"
                onClick={() => handleFeedback('good_lead')}
                disabled={feedbackLoading}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  feedback === 'good_lead'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-md'
                    : 'bg-secondary/40 border-border text-muted-foreground hover:text-white'
                }`}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> Good Lead
              </button>

              <button
                id="feedback-bad-btn"
                onClick={() => handleFeedback('bad_lead')}
                disabled={feedbackLoading}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  feedback === 'bad_lead'
                    ? 'bg-red-500/15 border-red-500/40 text-red-400 shadow-md'
                    : 'bg-secondary/40 border-border text-muted-foreground hover:text-white'
                }`}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> Bad Lead
              </button>

              <button
                id="feedback-irrelevant-btn"
                onClick={() => handleFeedback('irrelevant')}
                disabled={feedbackLoading}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  feedback === 'irrelevant'
                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400 shadow-md'
                    : 'bg-secondary/40 border-border text-muted-foreground hover:text-white'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Irrelevant
              </button>

              <button
                id="feedback-converted-btn"
                onClick={() => handleFeedback('converted')}
                disabled={feedbackLoading}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  feedback === 'converted'
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-md'
                    : 'bg-secondary/40 border-border text-muted-foreground hover:text-white'
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" /> Converted
              </button>
            </div>
          </div>

          {/* Lifecycle Tracking status */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white border-b border-border/50 pb-2">Lifecycle Tracking</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Created</span>
                <span className="font-medium text-white">{new Date(opportunity.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Viewed</span>
                <span className="font-medium text-white">
                  {opportunity.viewed_at ? new Date(opportunity.viewed_at).toLocaleTimeString() : 'Not viewed yet'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" /> Approved</span>
                <span className="font-medium text-white">
                  {opportunity.approved_at ? new Date(opportunity.approved_at).toLocaleTimeString() : 'Awaiting approval'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Send className="h-3.5 w-3.5" /> Posted</span>
                <span className="font-medium text-white">
                  {opportunity.posted_at ? new Date(opportunity.posted_at).toLocaleTimeString() : 'Not posted'}
                </span>
              </div>
              {opportunity.dismissed_at && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><Trash className="h-3.5 w-3.5 text-red-400" /> Dismissed</span>
                  <span className="font-medium text-white">{new Date(opportunity.dismissed_at).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
