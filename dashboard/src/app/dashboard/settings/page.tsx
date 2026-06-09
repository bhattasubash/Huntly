import { createServerSideClient } from '@/lib/supabase/server';
import { Settings, User, Key, Cpu, HelpCircle, BadgeAlert } from 'lucide-react';

export default async function SettingsPage() {
  const supabase = await createServerSideClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // Audit environment keys server-side (only show active/inactive flags, never the keys themselves)
  const isGeminiActive = !!process.env.GEMINI_API_KEY;
  const isGroqActive = !!process.env.GROQ_API_KEY;
  const isOpenRouterActive = !!process.env.OPENROUTER_API_KEY;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your credentials, audit connected LLM clients, and view profile parameters.</p>
      </div>

      {/* Profile Card */}
      <div className="glass p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-border/50 pb-2">
          <User className="h-5 w-5 text-primary" /> Profile Credentials
        </h3>
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Email Address
            </label>
            <div className="px-4 py-3 bg-secondary/30 border border-border/50 rounded-xl text-white font-medium">
              {user?.email}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              User Unique Identifier (UUID)
            </label>
            <div className="px-4 py-3 bg-secondary/30 border border-border/50 rounded-xl text-xs font-mono text-muted-foreground select-all">
              {user?.id}
            </div>
          </div>
        </div>
      </div>

      {/* Connected LLM Services Audit */}
      <div className="glass p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-border/50 pb-2">
          <Cpu className="h-5 w-5 text-primary" /> AI Model Providers
        </h3>
        <p className="text-xs text-muted-foreground">
          Audit which model keys are configured in your background environments. Model requests fall back dynamically.
        </p>

        <div className="space-y-3">
          {/* Gemini */}
          <div className="flex justify-between items-center p-3 bg-secondary/25 border border-border/40 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-white">Google Gemini (gemini-2.5-flash)</span>
              <p className="text-xs text-muted-foreground">Primary context profiler & subreddit generator</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              isGeminiActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {isGeminiActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Groq */}
          <div className="flex justify-between items-center p-3 bg-secondary/25 border border-border/40 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-white">Groq AI (llama-3.3-70b-versatile)</span>
              <p className="text-xs text-muted-foreground">High-performance intent evaluator</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              isGroqActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {isGroqActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* OpenRouter */}
          <div className="flex justify-between items-center p-3 bg-secondary/25 border border-border/40 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-white">OpenRouter (gemma-2-9b-it:free)</span>
              <p className="text-xs text-muted-foreground">Fallback free provider tier</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              isOpenRouterActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {isOpenRouterActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* General Docs / Information */}
      <div className="glass p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-border/50 pb-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Technical Architecture
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Huntly maintains a split-responsibility model. Your local background listening loop executes subreddit searches and processes intent signals via your machine. Discovered leads are safely written to Supabase where they become instant actionable notifications in this dashboard and on Telegram.
        </p>
      </div>
    </div>
  );
}
