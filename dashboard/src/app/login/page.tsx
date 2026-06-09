'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Lock, Mail, Sparkles, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync tab state with query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signup') {
      setIsSignUp(true);
    } else {
      setIsSignUp(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        
        // Supabase Auth auto-confirms or sends confirmation email
        if (data.session) {
          router.push('/dashboard');
        } else {
          setSuccessMsg('Verification email sent! Please check your inbox.');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (data.session) {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md glass p-8 rounded-2xl relative z-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 border border-primary/25 text-accent mb-3">
          <Sparkles className="h-3.5 w-3.5" /> Huntly SaaS V1
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          {isSignUp ? 'Create an account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSignUp
            ? 'Get started finding Reddit opportunities today.'
            : 'Sign in to access your listening dashboard.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full pl-11 pr-4 py-3 bg-secondary/50 rounded-xl border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-white placeholder-muted-foreground"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              id="auth-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3 bg-secondary/50 rounded-xl border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-white placeholder-muted-foreground"
            />
          </div>
        </div>

        <button
          id={isSignUp ? 'signup-submit-btn' : 'login-submit-btn'}
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
          ) : isSignUp ? (
            <>
              Create Account <ArrowRight className="h-5 w-5" />
            </>
          ) : (
            <>
              Sign In <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm">
        <span className="text-muted-foreground">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
        </span>
        <button
          id="auth-toggle-btn"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccessMsg(null);
          }}
          className="text-primary hover:underline font-semibold cursor-pointer"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background text-foreground relative px-4 overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header link back */}
      <div className="absolute top-8 left-8 flex items-center">
        <Link href="/" className="flex items-center">
          <img src="/huntly_logo.png" alt="Huntly Logo" className="h-14 w-auto object-contain" />
        </Link>
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md glass p-8 rounded-2xl relative z-10 flex items-center justify-center min-h-[400px]">
          <span className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
