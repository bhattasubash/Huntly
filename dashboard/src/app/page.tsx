'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Check, 
  ArrowRight, 
  Sparkles, 
  Loader2,
  MessageSquare,
  Home as HomeIcon,
  Inbox,
  Pencil,
  Settings,
  Bell,
  ChevronDown,
  Copy,
  Link as LinkIcon,
  Search,
  Send,
  Mail,
  Building,
  Globe
} from 'lucide-react';

// Custom Twitter SVG Icon
const TwitterIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Custom LinkedIn SVG Icon
const LinkedinIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>
  </svg>
);

// Custom SVG Mascot Blob (Lime green character from the mockup)
const MascotBlobSVG = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="blobGrad" x1="40" y1="20" x2="160" y2="180" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#d5ff66" />
        <stop offset="50%" stopColor="#aeff33" />
        <stop offset="100%" stopColor="#76d600" />
      </linearGradient>
      <filter id="blobGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="15" floodColor="#76d600" floodOpacity="0.3" />
      </filter>
    </defs>
    
    {/* Green Blob Body with 3 bottom lobes */}
    <path 
      d="M 35 90 
         C 25 45, 60 25, 100 25 
         C 140 25, 175 45, 165 90 
         C 160 115, 155 135, 140 135 
         C 130 135, 125 122, 115 122 
         C 105 122, 105 135, 100 135 
         C 95 135, 95 122, 85 122 
         C 75 122, 70 135, 60 135 
         C 45 135, 40 115, 35 90 Z" 
      fill="url(#blobGrad)" 
      filter="url(#blobGlow)"
    />
    
    {/* Eyes slanted slightly clockwise */}
    <rect x="98" y="56" width="10" height="24" rx="5" fill="white" transform="rotate(12 103 68)" />
    <rect x="122" y="50" width="10" height="24" rx="5" fill="white" transform="rotate(12 127 62)" />
    
    {/* Smile Mouth with Left Cheek Dimple */}
    <path 
      d="M 82 86 
         C 85 79, 91 81, 94 85 
         C 100 93, 120 89, 124 78" 
      stroke="white" 
      strokeWidth="6.5" 
      strokeLinecap="round" 
      fill="none" 
    />
  </svg>
);

// Line-art character 1 (left of CTA form at the bottom)
const LeftCharacterSVG = () => (
  <svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <path d="M 25 60 C 25 35, 75 35, 75 60 C 75 75, 75 80, 75 90 C 75 90, 25 90, 25 90 Z" fill="#ffffff" stroke="#111827" strokeWidth="2" />
    <path d="M 10 115 C 15 100, 25 90, 40 90 L 60 90 C 75 90, 85 100, 90 115" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
    <circle cx="50" cy="35" r="12" fill="#111827" />
    <circle cx="42" cy="62" r="7" stroke="#111827" strokeWidth="2" fill="none" />
    <circle cx="58" cy="62" r="7" stroke="#111827" strokeWidth="2" fill="none" />
    <path d="M 49 62 L 51 62" stroke="#111827" strokeWidth="2" />
    <circle cx="42" cy="62" r="1.5" fill="#111827" />
    <circle cx="58" cy="62" r="1.5" fill="#111827" />
    <path d="M 50 70 L 50 74" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 46 80 C 48 82, 52 82, 54 80" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Line-art character 2 (right of CTA form at the bottom)
const RightCharacterSVG = () => (
  <svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <path d="M 25 55 C 25 30, 75 30, 75 55 C 75 70, 75 80, 75 85 C 75 85, 25 85, 25 85 Z" fill="#ffffff" stroke="#111827" strokeWidth="2" />
    <path d="M 10 115 C 20 100, 30 85, 50 85 C 70 85, 80 100, 90 115" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
    <path d="M 22 45 C 35 30, 65 30, 78 45 L 85 52 L 15 52 Z" fill="#111827" stroke="#111827" strokeWidth="2" />
    <path d="M 80 50 L 95 55 L 85 60 Z" fill="#111827" stroke="#111827" strokeWidth="2" />
    <path d="M 42 74 C 46 72, 54 72, 58 74" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
    <path d="M 48 78 L 52 78" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
    <circle cx="40" cy="58" r="1.5" fill="#111827" />
    <circle cx="60" cy="58" r="1.5" fill="#111827" />
  </svg>
);

// Small Sparkline SVG for the Opps card
const SparklineSVG = () => (
  <svg className="w-16 h-8 text-emerald-500" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M 2 16 L 10 12 L 18 15 L 26 8 L 34 10 L 42 3 L 50 7 L 58 2" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

export default function Home() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  
  // Attribution parameters
  const [attribution, setAttribution] = useState({
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    referrer: '',
  });

  const supabase = createClient();

  // Load attribution details and current waitlist count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setAttribution({
        utmSource: urlParams.get('utm_source') || urlParams.get('ref') || '',
        utmMedium: urlParams.get('utm_medium') || '',
        utmCampaign: urlParams.get('utm_campaign') || '',
        referrer: document.referrer || '',
      });
    }

    async function fetchCount() {
      try {
        const { count, error } = await supabase
          .from('waitlist')
          .select('*', { count: 'exact', head: true });
        
        if (!error && count !== null) {
          setWaitlistCount(count);
        }
      } catch (err) {
        console.error('Error fetching waitlist count:', err);
      }
    }
    fetchCount();
  }, []);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !website) return;

    setStatus('loading');

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([
          {
            email: email.trim().toLowerCase(),
            website: website.trim(),
            company_name: companyName.trim() || null,
            utm_source: attribution.utmSource || null,
            utm_medium: attribution.utmMedium || null,
            utm_campaign: attribution.utmCampaign || null,
            referrer: attribution.referrer || null,
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          setStatus('duplicate');
        } else {
          console.error('Supabase error:', error);
          setErrorDetails(error.message || JSON.stringify(error));
          setStatus('error');
        }
      } else {
        setStatus('success');
        setWaitlistCount(prev => (prev !== null ? prev + 1 : 1));
      }
    } catch (err) {
      console.error('Submission catch error:', err);
      setErrorDetails(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  const scrollToWaitlist = (e: React.MouseEvent) => {
    e.preventDefault();
    const waitlistSection = document.getElementById('waitlist-section');
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const displayCount = waitlistCount !== null ? 127 + waitlistCount : 127;

  return (
    <div className="bg-[#f8f9fa] text-slate-900 min-h-screen font-sans antialiased selection:bg-[#b9ff66]/60 relative overflow-hidden">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#b9ff66]/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[-15%] w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none z-0"></div>

      {/* NAVIGATION NAVBAR */}
      <header className="fixed top-4 left-0 right-0 w-full z-50 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto bg-white/70 backdrop-blur-md border border-black rounded-full px-6 py-2.5 flex justify-between items-center shadow-[0_12px_30px_rgba(0,0,0,0.03)]">
          
          {/* Logo */}
          <div className="flex items-center">
            <img src="/huntly_logo.png" alt="Huntly Logo" className="h-11 w-auto object-contain" />
          </div>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <span className="hover:text-slate-900 cursor-not-allowed transition-colors">Product</span>
            <span className="hover:text-slate-900 cursor-not-allowed transition-colors">How it works</span>
            <span className="hover:text-slate-900 cursor-not-allowed transition-colors">Pricing</span>
            <span className="hover:text-slate-900 cursor-not-allowed transition-colors flex items-center gap-1">
              Resources <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </span>
          </nav>
          
          {/* Right Button */}
          <div>
            <a 
              href="#waitlist-section" 
              onClick={scrollToWaitlist}
              className="text-xs font-bold px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all duration-200 shadow-sm flex items-center gap-1.5"
            >
              Join Waitlist <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-20">
        {/* Glow spotlight decoration */}
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[85%] h-[60%] rounded-full bg-[#b9ff66]/15 blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[130px] pointer-events-none -z-10"></div>
        
        <div className="flex flex-col items-center text-center w-full relative">
          
          {/* Centered Headline and subheadings */}
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center mb-10">
            <h1 className="font-display font-black text-4xl sm:text-6xl xl:text-[4.2rem] leading-[1.05] tracking-tight text-slate-950 mb-6">
              Reddit buyers post every 4 minutes. <br className="hidden md:inline" />
              <span className="text-[#8be92a]">You're probably missing all of them.</span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-500 mb-8 max-w-2xl mx-auto leading-relaxed font-sans font-medium">
              Huntly scans Reddit, understands your product, and delivers high-intent conversations with AI replies you can trust.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
              <a
                href="#waitlist-section"
                onClick={scrollToWaitlist}
                className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
              >
                Join Waitlist <ArrowRight className="h-4 w-4" />
              </a>

              {/* Social Proof */}
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 select-none">
                <div className="flex -space-x-1.5">
                  <div className="w-5 h-5 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[9px]">👨‍💻</div>
                  <div className="w-5 h-5 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[9px]">👩‍💼</div>
                  <div className="w-5 h-5 rounded-full border-2 border-white bg-violet-100 flex items-center justify-center text-[9px]">🚀</div>
                </div>
                <span>Early access for the first 500 users</span>
              </div>
            </div>
          </div>

          {/* Centered Dashboard Mockup + Peeking Mascot */}
          <div className="max-w-5xl w-full mx-auto relative mt-4">
            
            {/* Subtle Product Radial Glow Anchor */}
            <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
              <div 
                className="w-[85%] h-[75%] rounded-full opacity-80 blur-[90px]"
                style={{
                  background: "radial-gradient(circle at center, rgba(185, 255, 102, 0.12) 0%, transparent 70%)"
                }}
              />
            </div>

            {/* Peeking Mascot Image */}
            <div className="absolute -top-40 right-4 w-64 h-64 -z-10 pointer-events-none select-none">
              <img 
                src="/hero_section_character.png" 
                alt="Huntly Mascot" 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Main Dashboard Card */}
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-[0_20px_45px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col w-full">
              
              {/* Dashboard Navbar */}
              <div className="border-b border-slate-100 px-5 py-2.5 flex items-center justify-between bg-white text-xs select-none">
                {/* Logo info */}
                <div className="flex items-center">
                  <img src="/huntly_logo.png" alt="Huntly Logo" className="h-8 w-auto object-contain" />
                </div>
                
                {/* Right utility items */}
                <div className="flex items-center gap-3">
                  <div className="relative cursor-pointer text-slate-400 hover:text-slate-600">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-[-1px] right-[-1px] bg-[#8be92a] h-1.5 w-1.5 rounded-full"></span>
                  </div>
                  <div className="h-5.5 w-5.5 rounded-full overflow-hidden border border-slate-200 cursor-pointer">
                    <img 
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                      alt="User avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Dashboard content grid (3-column style inside mockup) */}
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 text-left bg-slate-50/20">
                
                {/* Sidebar Navigation */}
                <div className="w-full md:w-38 bg-slate-50/30 p-3 shrink-0 flex flex-col justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#b9ff66]/15 text-slate-900 font-bold text-[11px] cursor-pointer">
                      <HomeIcon className="h-3.5 w-3.5 text-slate-800" /> Overview
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-900 font-bold text-[11px] cursor-pointer transition-colors">
                      <Inbox className="h-3.5 w-3.5" /> Mentions
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-900 font-bold text-[11px] cursor-pointer transition-colors">
                      <MessageSquare className="h-3.5 w-3.5" /> Conversations
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-900 font-bold text-[11px] cursor-pointer transition-colors">
                      <Pencil className="h-3.5 w-3.5" /> Replies
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-900 font-bold text-[11px] cursor-pointer transition-colors">
                      <Settings className="h-3.5 w-3.5" /> Settings
                    </div>
                  </div>

                  {/* Usage stats indicator */}
                  <div className="mt-6 pt-3 border-t border-slate-100/50 space-y-1 text-[9px]">
                    <div className="flex justify-between font-bold text-slate-400">
                      <span>Usage</span>
                      <span>78%</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200/50 rounded-full overflow-hidden">
                      <div className="h-full bg-[#8be92a] rounded-full w-[78%]"></div>
                    </div>
                    <p className="text-[8px] font-semibold text-slate-400">Resets in 6 days</p>
                  </div>
                </div>

                {/* Main Middle Pane (Reddit post + AI reply draft) */}
                <div className="flex-1 p-4 bg-white space-y-3">
                  
                  {/* Mention header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8be92a] animate-pulse"></span>
                      High-intent mention detected
                    </div>
                    <div className="flex items-center gap-0.5 px-2 py-0.5 border border-slate-200 rounded-md text-[9px] font-bold text-slate-500 cursor-pointer hover:bg-slate-50">
                      All Subreddits <ChevronDown className="h-2.5 w-2.5" />
                    </div>
                  </div>

                  {/* Reddit Post Card */}
                  <div className="border border-slate-100 bg-[#fafafa]/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="text-slate-800 font-extrabold lowercase bg-slate-200/60 h-3.5 w-3.5 rounded-full flex items-center justify-center">r</span>
                      <span>r/Productivity</span>
                      <span>•</span>
                      <span>2m ago</span>
                    </div>
                    <h3 className="text-[11px] sm:text-[12px] font-bold text-slate-900 leading-snug">
                      Looking for a tool that automatically finds high-intent leads on Reddit. Any suggestions?
                    </h3>
                    <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold pt-0.5 select-none">
                      <span className="flex items-center gap-1">▲ 23 ▼</span>
                      <span className="flex items-center gap-1">💬 17</span>
                      <span>🔗 Share</span>
                      <span>•••</span>
                    </div>
                  </div>

                  {/* AI Reply Draft Box */}
                  <div className="border border-[#b9ff66]/20 bg-[#b9ff66]/5 rounded-xl p-3 space-y-2.5">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Check className="h-3 w-3 text-[#76d600] stroke-[3]" /> AI Reply Draft
                      </div>
                      <span className="text-[#76d600]">Confidence: 92%</span>
                    </div>

                    <p className="text-[10.5px] sm:text-[11.5px] text-slate-600 leading-relaxed italic bg-white border border-slate-100 rounded-lg p-2.5">
                      "Huntly does exactly that. It monitors Reddit in real-time, finds high-intent buyers, and drafts replies you can approve in one click. Highly recommend!"
                    </p>

                    <div className="flex items-center gap-1.5 pt-0.5 text-[10px]">
                      <button className="px-3 py-1 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-0.5">
                        Approve Reply
                      </button>
                      <button className="px-3 py-1 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors">
                        Edit Reply
                      </button>
                      <button className="p-1 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* Right Statistics Pane */}
                <div className="w-full md:w-48 p-4 bg-slate-50/20 flex flex-col gap-2.5 shrink-0">
                  
                  {/* Card 1: Opportunities Found */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Opportunities Found</p>
                    <div className="flex items-end justify-between mt-0.5">
                      <div>
                        <h4 className="text-lg font-black text-slate-800">127</h4>
                        <span className="text-[8px] font-bold text-emerald-500">↑ 34% this week</span>
                      </div>
                      <SparklineSVG />
                    </div>
                  </div>

                  {/* Card 2: Replies Generated */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Replies Generated</p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">342</h4>
                      <span className="text-[8px] font-bold text-violet-500">↑ 28% this week</span>
                    </div>
                    <div className="h-7.5 w-7.5 rounded-lg bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Card 3: Replies Approved */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Replies Approved</p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">191</h4>
                      <span className="text-[8px] font-bold text-emerald-500">↑ 41% this week</span>
                    </div>
                    <div className="h-7.5 w-7.5 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                      <div className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[8px]">
                        ✓
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
          
        </div>
      </section>

      {/* BEFORE/AFTER SECTION */}
      <section className="max-w-5xl mx-auto px-6 py-24 border-t border-[#edf2e3] relative z-20">
        {/* Glow spotlight decoration */}
        <div className="absolute top-[15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/15 blur-[110px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-[15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-[#b9ff66]/20 blur-[120px] pointer-events-none -z-10"></div>
        <h2 className="font-display tracking-tight text-slate-950 text-3xl sm:text-4xl xl:text-[3.2rem] font-black mb-20 leading-tight text-center max-w-2xl mx-auto">
          Most founders <br className="hidden sm:inline" /> miss the signals<span className="text-[#8be92a]">.</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch relative">
          
          {/* Peeking Mascot for Missed Signals */}
          <div className="absolute -top-48 -right-24 w-[345px] h-[345px] z-30 pointer-events-none select-none hidden md:block">
            <img 
              src="/founders_miss_signal.png" 
              alt="Mascot Missed Signals" 
              className="w-full h-full object-contain"
            />
          </div>

          {/* WITHOUT SIGNALHOP */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.015)] flex flex-col justify-between relative">
            <div>
              {/* Card Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <span className="text-red-500 font-extrabold text-sm select-none">✕</span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 font-sans">
                  Without Huntly
                </h3>
              </div>
              
              <div className="h-px bg-[#edf2e3]/60 mb-6"></div>

              {/* List */}
              <ul className="space-y-5">
                {[
                  "Hours lost manually searching Reddit",
                  "Hard to know what's worth replying to",
                  "Replies take time (if you reply at all)",
                  "Opportunities are gone before you see them"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3.5 text-[13px] font-bold text-slate-500 font-sans">
                    <span className="h-5 w-5 rounded-full bg-red-50/70 text-red-500 flex items-center justify-center shrink-0 font-black text-xs select-none">
                      -
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="bg-red-50/50 border-l-[3px] border-red-500 rounded-xl p-4 mt-10 flex items-center">
              <span className="text-xs font-black tracking-wider text-red-600 uppercase font-sans">
                Wasted time. Missed customers.
              </span>
            </div>
          </div>

          {/* WITH SIGNALHOP */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.015)] flex flex-col justify-between relative z-10">
            <div>
              {/* Card Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="h-10 w-10 rounded-full bg-[#b9ff66]/20 flex items-center justify-center shrink-0">
                  <Check className="h-4.5 w-4.5 text-slate-900 stroke-[3.5]" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 font-sans">
                  With Huntly
                </h3>
              </div>
              
              <div className="h-px bg-[#edf2e3]/60 mb-6"></div>

              {/* List */}
              <ul className="space-y-5">
                {[
                  "High-intent conversations delivered daily",
                  "AI identifies real buying intent",
                  "AI drafts replies that sound like you",
                  "You approve in one click — or edit freely"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3.5 text-[13px] font-bold text-slate-700 font-sans">
                    <span className="h-5 w-5 rounded-full bg-[#b9ff66]/15 text-emerald-600 flex items-center justify-center shrink-0 select-none">
                      <Check className="h-3 w-3 text-emerald-600 stroke-[3.5]" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="bg-[#b9ff66]/15 border-l-[3px] border-[#76d600] rounded-xl p-4 mt-10 flex items-center">
              <span className="text-xs font-black tracking-wider text-slate-800 uppercase font-sans leading-tight">
                More conversations. <br /> More customers.
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#edf2e3] text-center relative z-20">
        {/* Glow spotlight decoration */}
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[80%] h-[55%] rounded-full bg-[#b9ff66]/15 blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[100px] pointer-events-none -z-10"></div>
        <h2 className="font-display tracking-tight text-slate-950 text-2xl sm:text-3xl xl:text-[2.5rem] font-black mb-20 leading-tight text-center max-w-2xl mx-auto">
          How Huntly works
        </h2>

        <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-0 max-w-7xl mx-auto relative">
          
          {/* Card 1 */}
          <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.015)] flex flex-col justify-start text-left relative overflow-visible">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black tracking-wider text-slate-800 bg-[#b9ff66]/30 rounded-full px-3 py-1 inline-block uppercase font-sans">
                Step 1
              </span>
              <span className="text-5xl font-black text-[#8be92a]/10 select-none font-display">01</span>
            </div>
            
            <div className="h-10 w-10 rounded-xl bg-[#b9ff66]/20 flex items-center justify-center border border-[#b9ff66]/10 text-slate-800 mb-6 shrink-0">
              <LinkIcon className="h-5 w-5" />
            </div>

            <h4 className="font-display font-black text-slate-900 text-lg mb-2">Connect your product</h4>
            <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-sans font-semibold">
              Add your website and tell us what you do.
            </p>
          </div>
          
          {/* Connector 1 */}
          <div className="hidden md:flex items-center justify-center px-4 shrink-0 pointer-events-none select-none">
            <div className="h-3.5 w-3.5 rounded-full border-[2.5px] border-[#8be92a] bg-white"></div>
            <div className="w-6 h-0.5 bg-[#8be92a]/50"></div>
            <div className="h-3.5 w-3.5 rounded-full border-[2.5px] border-[#8be92a] bg-white"></div>
          </div>
          
          {/* Card 2 */}
          <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.015)] flex flex-col justify-start text-left relative overflow-visible">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black tracking-wider text-slate-800 bg-[#b9ff66]/30 rounded-full px-3 py-1 inline-block uppercase font-sans">
                Step 2
              </span>
              <span className="text-5xl font-black text-[#8be92a]/10 select-none font-display">02</span>
            </div>
            
            <div className="h-10 w-10 rounded-xl bg-[#b9ff66]/20 flex items-center justify-center border border-[#b9ff66]/10 text-slate-800 mb-6 shrink-0">
              <Search className="h-5 w-5" />
            </div>

            <h4 className="font-display font-black text-slate-900 text-lg mb-2">We find buying intent</h4>
            <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-sans font-semibold">
              Huntly scans Reddit 24/7 and finds people looking for solutions like yours.
            </p>
          </div>

          {/* Connector 2 */}
          <div className="hidden md:flex items-center justify-center px-4 shrink-0 pointer-events-none select-none">
            <div className="h-3.5 w-3.5 rounded-full border-[2.5px] border-[#8be92a] bg-white"></div>
            <div className="w-6 h-0.5 bg-[#8be92a]/50"></div>
            <div className="h-3.5 w-3.5 rounded-full border-[2.5px] border-[#8be92a] bg-white"></div>
          </div>

          {/* Card 3 */}
          <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.015)] flex flex-col justify-start text-left relative overflow-visible z-10">
            
            {/* Peeking Mascot with Magic Wand */}
            <div className="absolute -top-44 -right-20 w-72 h-72 -z-10 pointer-events-none select-none hidden md:block">
              <img 
                src="/waitlist_form_character.png" 
                alt="Mascot Magic Wand" 
                className="w-full h-full object-contain scale-x-[-1]"
              />
            </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black tracking-wider text-slate-800 bg-[#b9ff66]/30 rounded-full px-3 py-1 inline-block uppercase font-sans">
                Step 3
              </span>
              <span className="text-5xl font-black text-[#8be92a]/10 select-none font-display">03</span>
            </div>
            
            <div className="h-10 w-10 rounded-xl bg-[#b9ff66]/20 flex items-center justify-center border border-[#b9ff66]/10 text-slate-800 mb-6 shrink-0">
              <Send className="h-5 w-5" />
            </div>

            <h4 className="font-display font-black text-slate-900 text-lg mb-2">Review & approve replies</h4>
            <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-sans font-semibold">
              Review AI-drafted replies, approve in one click, and start real conversations.
            </p>
          </div>
        </div>
      </section>

      {/* CTA / WAITLIST SECTION */}
      <section id="waitlist-section" className="max-w-2xl mx-auto px-6 py-24 scroll-mt-18 relative z-20">
        {/* Glow spotlight decoration */}
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#b9ff66]/30 blur-[90px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[350px] h-[350px] rounded-full bg-violet-500/12 blur-[100px] pointer-events-none -z-10"></div>
        
        {/* Main Waitlist Card Container */}
        <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 text-center border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] relative overflow-visible">

          {/* Early Access Tag */}
          <div className="inline-flex items-center gap-1.5 bg-[#b9ff66]/20 text-slate-800 text-[10px] font-black tracking-wider px-3.5 py-1.5 rounded-full uppercase font-sans mb-6">
            <Sparkles className="h-3 w-3 text-slate-700 stroke-[2.5]" /> Early Access
          </div>

          <h2 className="font-display tracking-tight text-slate-950 text-2xl sm:text-3xl xl:text-[2.8rem] font-black mb-4 leading-tight">
            Be among the first <br /> founders to try Huntly<span className="text-[#8be92a]">.</span>
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-500 font-semibold mb-6 leading-relaxed max-w-sm mx-auto">
            We're opening access gradually while we refine Huntly. Early waitlist members will receive priority access when invitations begin.
          </p>

          {/* Waitlist count */}
          <div className="inline-flex items-center gap-2 bg-[#b9ff66]/15 border border-[#b9ff66]/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 mb-10 shadow-sm">
            <div className="flex -space-x-1">
              <div className="w-4.5 h-4.5 rounded-full border border-white bg-blue-200 flex items-center justify-center text-[7px]">👨‍💻</div>
              <div className="w-4.5 h-4.5 rounded-full border border-white bg-emerald-200 flex items-center justify-center text-[7px]">👩‍💼</div>
              <div className="w-4.5 h-4.5 rounded-full border border-white bg-violet-200 flex items-center justify-center text-[7px]">🚀</div>
            </div>
            <span>{displayCount} founders already on the list</span>
          </div>

          {status === 'success' ? (
            <div className="bg-[#b9ff66]/10 border border-[#b9ff66]/30 rounded-3xl p-6 text-center space-y-3 shadow-sm">
              <div className="h-10 w-10 bg-slate-900 text-[#b9ff66] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="h-5 w-5 stroke-[2.5]" />
              </div>
              <h4 className="font-extrabold text-slate-950 text-base uppercase tracking-tight">You're on the list!</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-bold">
                We'll send early access invitations as Huntly rolls out. Keep an eye on your inbox.
              </p>
            </div>
          ) : (
            <form onSubmit={handleJoinWaitlist} className="space-y-5 text-left">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email address */}
                <div>
                  <label htmlFor="email" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Email Address <span className="text-slate-900">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 h-8 w-8 rounded-lg bg-[#b9ff66]/20 flex items-center justify-center border border-[#b9ff66]/10 text-slate-800 shrink-0 pointer-events-none">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="you@company.com"
                      disabled={status === 'loading'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-slate-900 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#b9ff66]/40 transition-all disabled:opacity-60 text-slate-900 font-semibold"
                    />
                  </div>
                </div>

                {/* Your website */}
                <div>
                  <label htmlFor="website" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Your website <span className="text-slate-900">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 h-8 w-8 rounded-lg bg-[#b9ff66]/20 flex items-center justify-center border border-[#b9ff66]/10 text-slate-800 shrink-0 pointer-events-none">
                      <Globe className="h-4 w-4" />
                    </div>
                    <input
                      id="website"
                      type="text"
                      required
                      placeholder="yourproduct.com"
                      disabled={status === 'loading'}
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-slate-900 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#b9ff66]/40 transition-all disabled:opacity-60 text-slate-900 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Company name (optional) */}
              <div>
                <label htmlFor="companyName" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Company name <span className="text-slate-300 font-semibold">(Optional)</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 h-8 w-8 rounded-lg bg-[#b9ff66]/20 flex items-center justify-center border border-[#b9ff66]/10 text-slate-800 shrink-0 pointer-events-none">
                    <Building className="h-4 w-4" />
                  </div>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="Acme Inc."
                    disabled={status === 'loading'}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-slate-900 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#b9ff66]/40 transition-all disabled:opacity-60 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* Errors handling */}
              {status === 'duplicate' && (
                <p className="text-xs text-slate-800 bg-[#b9ff66]/50 border border-[#b9ff66]/80 p-3 rounded-2xl font-bold text-center mt-2 shadow-sm">
                  You're already on the waitlist. We'll notify you when access becomes available.
                </p>
              )}
              {status === 'error' && (
                <div className="text-xs text-white bg-red-500 border border-red-600 p-3 rounded-2xl font-bold text-center mt-2 shadow-sm space-y-1">
                  <p>Something went wrong. Please check details and try again.</p>
                  {errorDetails && (
                    <p className="text-[10px] font-mono opacity-90 bg-red-600/50 p-1.5 rounded-lg border border-red-700/50 mt-1 select-all break-all text-left">
                      Details: {errorDetails}
                    </p>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black rounded-full shadow-md transition-all duration-150 disabled:opacity-65 flex items-center justify-between p-1.5 pr-2 pl-6 cursor-pointer text-sm font-sans"
              >
                <span>{status === 'loading' ? 'Joining Waitlist...' : 'Join Early Access Waitlist'}</span>
                <div className="h-8 w-8 rounded-full bg-[#b9ff66] text-slate-900 flex items-center justify-center shrink-0">
                  {status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  )}
                </div>
              </button>
            </form>
          )}

          {/* Trust line */}
          <div className="flex items-start justify-center gap-3 mt-6 text-[10.5px] text-slate-500 font-semibold leading-relaxed text-left max-w-sm mx-auto">
            <div className="h-4.5 w-4.5 rounded-full border-2 border-emerald-500/80 text-emerald-500 flex items-center justify-center shrink-0 font-black text-[9px] mt-0.5 select-none">
              ✓
            </div>
            <div>
              No spam. No newsletters. <br />
              Only product updates and early access invitations.
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-6 pb-12 relative z-20">
        {/* Glow spotlight decoration */}
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[90%] h-[65%] rounded-full bg-[#b9ff66]/18 blur-[130px] pointer-events-none -z-10"></div>
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_12px_40px_rgba(0,0,0,0.02)] relative overflow-visible">
          
          {/* CTA Banner Card */}
          <div className="bg-gradient-to-br from-[#f4fde0] to-[#e9f8c5]/90 border border-[#b9ff66]/40 rounded-[2rem] p-10 sm:p-14 mb-16 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden shadow-sm">
            <div className="text-left space-y-2">
              <h3 className="font-display font-black text-slate-900 text-xl sm:text-2xl xl:text-[1.8rem] tracking-tight leading-none mb-1">
                Ready to stop missing buyers?
              </h3>
              <p className="text-sm text-slate-600 font-sans font-medium">
                Join early access and be the first to convert <br className="hidden sm:inline" /> Reddit conversations into customers.
              </p>
            </div>
            
            <div className="relative shrink-0">
              {/* Radiating ticks/sparkles next to button */}
              <div className="absolute -top-3.5 -right-3.5 pointer-events-none select-none text-[#b9ff66] w-7 h-7">
                <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-[#b9ff66]" strokeWidth="3.5" strokeLinecap="round">
                  <line x1="12" y1="22" x2="12" y2="10" />
                  <line x1="12" y1="22" x2="4" y2="14" />
                  <line x1="12" y1="22" x2="20" y2="14" />
                </svg>
              </div>

              <a
                href="#waitlist-section"
                onClick={scrollToWaitlist}
                className="bg-[#0c101c] hover:bg-[#151a2b] text-white font-bold rounded-full shadow-lg transition-all flex items-center justify-between p-1 pl-6 pr-2 gap-4 cursor-pointer text-sm font-sans w-52 select-none"
              >
                <span className="font-bold tracking-tight text-white font-sans">Join Waitlist</span>
                <div className="h-8 w-8 rounded-full bg-[#d5ff66] text-slate-900 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-4.5 w-4.5 stroke-[2.5]" />
                </div>
              </a>
            </div>
          </div>
          
          {/* Separator line */}
          <div className="h-px bg-[#edf2e3]/60 mb-10"></div>
          
          {/* Footer links grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left relative overflow-visible pb-12">
            
            {/* Brand Col */}
            <div className="md:col-span-4 space-y-4">
              <div className="flex items-center">
                <img src="/huntly_logo.png" alt="Huntly Logo" className="h-11 w-auto object-contain" />
              </div>
              
              <p className="text-[13px] text-slate-500 font-sans font-medium leading-relaxed max-w-[220px]">
                AI co-pilot for finding customers on Reddit.
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-2 pt-1">
                <a 
                  href="#" 
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-850 cursor-not-allowed transition-colors"
                >
                  <TwitterIcon className="h-4 w-4" />
                </a>
                <a 
                  href="#" 
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-850 cursor-not-allowed transition-colors"
                >
                  <LinkedinIcon className="h-4 w-4" />
                </a>
                <a 
                  href="mailto:contact@huntly.com" 
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-850 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Links columns */}
            <div className="md:col-span-5 grid grid-cols-3 gap-4">
              
              {/* Col 1 */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">Product</span>
                <ul className="space-y-2.5 text-slate-900 font-semibold font-sans text-xs">
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Features</span></li>
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">How it works</span></li>
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Pricing</span></li>
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Use cases</span></li>
                </ul>
              </div>

              {/* Col 2 */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">Company</span>
                <ul className="space-y-2.5 text-slate-900 font-semibold font-sans text-xs">
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">About us</span></li>
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Contact</span></li>
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Twitter</span></li>
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Blog</span></li>
                </ul>
              </div>

              {/* Col 3 */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">Legal</span>
                <ul className="space-y-2.5 text-slate-900 font-semibold font-sans text-xs">
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Privacy</span></li>
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Terms</span></li>
                  <li><span className="hover:text-slate-600 cursor-not-allowed transition-colors">Cookie Policy</span></li>
                </ul>
              </div>

            </div>

            {/* Sleeping Mascot on right */}
            <div className="md:col-span-3 relative h-full flex items-end justify-end select-none pointer-events-none">
              <div className="absolute bottom-[-16px] right-[-16px] w-[250px] h-[250px] z-20">
                <img 
                  src="/footer_character.png" 
                  alt="Sleeping Mascot" 
                  className="w-full h-full object-contain"
                />
                
                {/* Floating Z's */}
                <span className="absolute bottom-[115px] right-[45px] text-3xl font-black text-slate-900 select-none font-display -rotate-12 animate-pulse">Z</span>
                <span className="absolute bottom-[95px] right-[78px] text-xl font-bold text-slate-700 select-none font-display -rotate-12 animate-pulse">z</span>
                <span className="absolute bottom-[75px] right-[105px] text-sm font-bold text-slate-600 select-none font-display -rotate-12 animate-pulse">z</span>
              </div>
            </div>

          </div>

          {/* Copyright */}
          <div className="text-left text-[10px] text-slate-400 font-bold font-sans">
            &copy; {new Date().getFullYear()} Huntly. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
