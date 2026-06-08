'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeWebsite, saveProject, deleteProject, ProductProfile } from './actions';
import { Plus, Trash2, Globe, Sparkles, Tag, Layers, RefreshCw, X, ShieldAlert, ArrowRight, FolderGit2 } from 'lucide-react';

interface ProjectsClientProps {
  initialProjects: any[];
}

export default function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const router = useRouter();

  // Wizard state
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = Form, 2 = Scraping, 3 = Review
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated review state
  const [profile, setProfile] = useState<ProductProfile | null>(null);
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [newSub, setNewSub] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  // General state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const openWizard = () => {
    setCompanyName('');
    setWebsiteUrl('');
    setProfile(null);
    setSubreddits([]);
    setStep(1);
    setError(null);
    setIsOpen(true);
  };

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl) return;

    setStep(2);
    setLoading(true);
    setError(null);

    // Ensure URL has protocol
    let formattedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const res = await analyzeWebsite(formattedUrl, companyName.trim());
    if (res.success && res.profile && res.subreddits) {
      setProfile(res.profile);
      setSubreddits(res.subreddits);
      setStep(3);
    } else {
      setError(res.error || 'Failed to analyze website.');
      setStep(1);
    }
    setLoading(false);
  };

  const handleSaveProject = async () => {
    if (!profile || !websiteUrl) return;
    setLoading(true);
    setError(null);

    let formattedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const res = await saveProject(
      profile.productName,
      formattedUrl,
      profile,
      subreddits
    );

    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to save project.');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete project "${name}"? This will also delete all associated opportunities.`)) {
      return;
    }
    setActionLoading(id);
    const res = await deleteProject(id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete project.');
    }
    setActionLoading(null);
  };

  // Tag helpers for review step
  const addSubreddit = () => {
    const clean = newSub.toLowerCase().trim().replace(/^r\//i, '').replace(/[^a-z0-9_]/g, '');
    if (clean && !subreddits.includes(clean)) {
      setSubreddits([...subreddits, clean]);
      setNewSub('');
    }
  };

  const removeSubreddit = (sub: string) => {
    setSubreddits(subreddits.filter((s) => s !== sub));
  };

  const addKeyword = () => {
    const clean = newKeyword.trim().toLowerCase();
    if (clean && profile && !profile.keywords.includes(clean)) {
      setProfile({
        ...profile,
        keywords: [...profile.keywords, clean],
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    if (profile) {
      setProfile({
        ...profile,
        keywords: profile.keywords.filter((k) => k !== kw),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your products and configure active listening subreddit signals.</p>
        </div>
        <button
          id="projects-create-btn"
          onClick={openWizard}
          className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-primary/20"
        >
          <Plus className="h-5 w-5" /> New Project
        </button>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {initialProjects.length > 0 ? (
          initialProjects.map((project) => {
            let contextObj: any = null;
            try {
              if (project.product_context) {
                contextObj = JSON.parse(project.product_context);
              }
            } catch (e) {}

            return (
              <div key={project.id} className="glass p-6 rounded-2xl flex flex-col justify-between premium-card">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white tracking-tight">{project.company_name}</h3>
                      <a
                        href={project.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3.5 w-3.5" /> {project.website_url}
                      </a>
                    </div>
                    <button
                      id={`project-delete-${project.id}-btn`}
                      onClick={() => handleDelete(project.id, project.company_name)}
                      disabled={actionLoading === project.id}
                      className="p-2.5 bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-border rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {contextObj?.oneLineDescription || 'No description available.'}
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" /> Subreddits ({project.subreddits.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {project.subreddits.slice(0, 8).map((sub: string) => (
                        <span key={sub} className="px-2 py-0.5 rounded bg-secondary/80 text-muted-foreground text-xs font-semibold">
                          r/{sub}
                        </span>
                      ))}
                      {project.subreddits.length > 8 && (
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-accent text-xs font-bold">
                          +{project.subreddits.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/30 mt-6 flex justify-between items-center text-xs text-muted-foreground">
                  <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Active Listening
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 glass p-16 rounded-3xl text-center space-y-6">
            <FolderGit2 className="h-16 w-16 text-muted-foreground/30 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">No projects found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                Add your first project to start crawling websites and listening for buying intent on Reddit.
              </p>
            </div>
            <button
              onClick={openWizard}
              className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm"
            >
              Add Your First Project
            </button>
          </div>
        )}
      </div>

      {/* Wizard Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl glass rounded-3xl p-8 max-h-[90vh] overflow-y-auto relative border border-border shadow-2xl flex flex-col justify-between">
            <button
              id="wizard-close-btn"
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 bg-secondary text-muted-foreground hover:text-white rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Wizard Steps indicator */}
            <div className="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className={step === 1 ? 'text-primary' : 'text-white'}>1. Website Url</span>
              <span>&middot;</span>
              <span className={step === 2 ? 'text-primary animate-pulse' : step > 2 ? 'text-white' : ''}>2. Context Scraping</span>
              <span>&middot;</span>
              <span className={step === 3 ? 'text-primary' : ''}>3. Review Signals</span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2 text-sm">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Input Form */}
            {step === 1 && (
              <form onSubmit={handleStartAnalysis} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-white">Create a New Project</h3>
                  <p className="text-sm text-muted-foreground">SignalHop will scrape your landing page, generate a product profile, and find relevant subreddits automatically.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Company Name (Optional)
                    </label>
                    <input
                      id="wizard-company-name"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. ExcaliStudy"
                      className="w-full px-4 py-3 bg-secondary/50 rounded-xl border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none text-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Landing Page URL
                    </label>
                    <input
                      id="wizard-website-url"
                      type="text"
                      required
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://excalistudy.vercel.app/"
                      className="w-full px-4 py-3 bg-secondary/50 rounded-xl border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none text-white transition-all"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50 flex justify-end">
                  <button
                    id="wizard-next-btn"
                    type="submit"
                    className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer"
                  >
                    Analyze Landing Page <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Scraping Loader */}
            {step === 2 && (
              <div className="py-16 text-center space-y-6">
                <div className="relative h-16 w-16 mx-auto flex items-center justify-center">
                  <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                  <Sparkles className="h-5 w-5 text-accent absolute top-0 right-0 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Synthesizing Product Context...</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Downloading landing page, extracting product features, and discovery buying signals with Gemini AI.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Review Discovered Settings */}
            {step === 3 && profile && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-white">Review Generated Signals</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize your generated profile, keywords, and target subreddits before activating monitors.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* One Line Description */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Product Summary
                    </label>
                    <textarea
                      value={profile.oneLineDescription}
                      onChange={(e) => setProfile({ ...profile, oneLineDescription: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-secondary/50 rounded-xl border border-border outline-none text-white transition-all text-sm resize-none"
                    />
                  </div>

                  {/* Target Keywords */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Discovered Keywords ({profile.keywords.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-secondary/30 rounded-xl border border-border/50 max-h-32 overflow-y-auto">
                      {profile.keywords.map((kw) => (
                        <span key={kw} className="px-2 py-1 rounded bg-secondary text-white text-xs font-medium flex items-center gap-1.5">
                          {kw}
                          <button onClick={() => removeKeyword(kw)} className="text-muted-foreground hover:text-red-400">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Add manual keyword"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                        className="flex-1 px-3 py-2 bg-secondary/50 rounded-xl border border-border outline-none text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={addKeyword}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Target Subreddits */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Subreddits ({subreddits.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-secondary/30 rounded-xl border border-border/50 max-h-32 overflow-y-auto">
                      {subreddits.map((sub) => (
                        <span key={sub} className="px-2 py-1 rounded bg-primary/10 text-accent text-xs font-medium flex items-center gap-1.5">
                          r/{sub}
                          <button onClick={() => removeSubreddit(sub)} className="text-muted-foreground hover:text-red-400">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSub}
                        onChange={(e) => setNewSub(e.target.value)}
                        placeholder="Add subreddit (e.g. saas)"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubreddit())}
                        className="flex-1 px-3 py-2 bg-secondary/50 rounded-xl border border-border outline-none text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={addSubreddit}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50 flex justify-between items-center">
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-muted-foreground hover:text-white"
                  >
                    Back to Form
                  </button>
                  <button
                    id="wizard-save-btn"
                    onClick={handleSaveProject}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-primary/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    ) : (
                      <>
                        Save & Monitor <Sparkles className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
