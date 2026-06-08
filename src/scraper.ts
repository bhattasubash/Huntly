// ============================================================
//  src/scraper.ts — Reddit Ingestion Engine + Orchestrator
//
//  Responsibilities:
//  1. Connect to Supabase with the Service Role Key
//  2. Run a 5-minute interval loop over all project subreddits
//  3. Fetch /r/sub/new.json with rotating User-Agents
//  4. Deduplicate against ingested_posts in a single query
//  5. Apply heuristic keyword filter (zero AI cost)
//  6. Trigger contextScraper on-demand (and cache result)
//  7. Route high-signal posts through Gemini intent processor
//  8. Fire Telegram alert for confirmed high-intent posts
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

import * as cheerio from 'cheerio';
import { scrapeProductContext, parseStoredProductProfile } from './contextScraper';
import { classifyPostIntent } from './intentProcessor';
import { sendTelegramAlert } from './telegramRouter';
import { Project, RedditPost, IntentResult, ProductProfile } from './types';

// ─── Constants ────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes

/**
 * Buying-intent signal phrases for zero-cost pre-filter.
 * These indicate the post author is in a problem-seeking or
 * purchase-consideration state. A post must match at least one
 * of these AND at least one project keyword to pass.
 */
const BUYING_SIGNAL_PHRASES: string[] = [
  // General problem/solution seeking
  'recommend',
  'recommendation',
  'alternative',
  'alternatives',
  'looking for',
  'anyone know',
  'best tool',
  'best app',
  'best platform',
  'best website',
  'software for',
  'app for',
  'tool for',
  'frustrated with',
  'sick of',
  'any suggestions',
  'what do you use',
  'help me find',
  'need something',
  'tried everything',
  'switched from',
  'is there a',
  'does anyone',
  'how do i',
  'where can i',
  'i need help',
  'struggling with',
  'confused about',
  'not sure which',
  'which is better',
  'comparison',
  'vs ',
  'can anyone',
  'any good',
  'tips for',
  'advice on',
  'what is the best',
  'has anyone tried',
  'what are you using',
  'need a way to',
  'trying to find',
  'hard to',
  'difficult to',
  'cant figure out',
  'can\'t figure out',
  // Education / career-guidance signals
  'after 12',
  'after 10',
  'what to study',
  'which course',
  'which college',
  'which university',
  'career advice',
  'career guidance',
  'career path',
  'what should i study',
  'which field',
  'entrance exam',
  'admission',
  'scholarship',
  'abroad study',
  'study abroad',
  'gap year',
  // Student / study / productivity signals
  'study tips',
  'how to study',
  'study method',
  'study schedule',
  'study plan',
  'study habit',
  'note taking',
  'note-taking',
  'notetaking',
  'organize notes',
  'organise notes',
  'keep track',
  'track assignments',
  'track my assignments',
  'manage assignments',
  'assignment tracker',
  'organize my studies',
  'organise my studies',
  'overwhelmed with',
  'overwhelmed by',
  'behind on',
  'procrastinat',
  'focus while studying',
  'stay on top of',
  'semester planner',
  'course planner',
  'visual learning',
  'mind map',
  'flashcard',
  'revision tool',
  'study workspace',
  'productivity app',
  'task manager',
  'getting organized',
  'get organized',
  'stay organized',
  // SaaS / indie hacker signals
  'launch',
  'mvp',
  'side project',
  'saas',
  'customer acquisition',
  'lead generation',
  'growing my',
  'getting users',
  'getting customers',
  'scaling',
  'monetize',
];

/** Rotating User-Agent pool to avoid Reddit rate limiting */
const USER_AGENTS: string[] = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

// ─── Module State ─────────────────────────────────────────────
let userAgentIndex = 0;
let supabase: SupabaseClient;

// ─── Supabase Init ────────────────────────────────────────────
function initSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. ' +
        'Copy .env.example → .env and fill in your credentials.'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ─── Rotating Axios Client ────────────────────────────────────
function buildRedditClient(): AxiosInstance {
  const ua = USER_AGENTS[userAgentIndex % USER_AGENTS.length];
  userAgentIndex++;

  return axios.create({
    timeout: 12_000,
    headers: {
      'User-Agent': ua,
    },
  });
}

// ─── Reddit Fetcher (RSS) ─────────────────────────────────────
/**
 * Parses an RSS Atom feed from Reddit into RedditPost objects.
 */
function parseRssFeed(xmlData: string, subreddit: string): RedditPost[] {
  const $ = cheerio.load(xmlData, { xmlMode: true });
  const entries = $('entry');
  const posts: RedditPost[] = [];

  entries.each((_, el) => {
    const entry = $(el);
    const title = entry.find('title').text().trim();
    const link = entry.find('link').attr('href') || '';

    const rawId = entry.find('id').text();
    const idMatch = rawId.match(/(t3_[a-zA-Z0-9]+)/);
    const name = idMatch ? idMatch[1] : rawId;
    const id = name.replace('t3_', '');

    const author = entry.find('author name').text().trim();

    const htmlContent = entry.find('content').text();
    const contentDoc = cheerio.load(htmlContent);
    const selftext = contentDoc('div.md').text().trim();

    let permalink = link;
    try {
      permalink = new URL(link).pathname;
    } catch {
      // Fallback if URL parsing fails
    }

    const createdText = entry.find('updated').text();
    const created_utc = createdText
      ? Math.floor(Date.parse(createdText) / 1000)
      : Math.floor(Date.now() / 1000);

    posts.push({
      id,
      name,
      title,
      selftext,
      subreddit,
      permalink,
      author,
      url: link,
      score: 0,
      num_comments: 0,
      created_utc,
    });
  });

  return posts;
}

// ─── Reddit Fetcher (JSON fallback) ──────────────────────────
/**
 * Parses a Reddit JSON API response into RedditPost objects.
 * Used as fallback when RSS returns 4xx for small/unlisted subreddits.
 */
function parseJsonFeed(data: any, subreddit: string): RedditPost[] {
  const children = data?.data?.children ?? [];
  return children.map((child: any) => {
    const p = child.data;
    return {
      id: p.id,
      name: p.name, // e.g. t3_abc123
      title: p.title || '',
      selftext: p.selftext || '',
      subreddit: p.subreddit || subreddit,
      permalink: p.permalink || '',
      author: p.author || '',
      url: p.url || '',
      score: p.score ?? 0,
      num_comments: p.num_comments ?? 0,
      created_utc: p.created_utc ?? Math.floor(Date.now() / 1000),
    } as RedditPost;
  });
}

// ─── Reddit Fetcher ───────────────────────────────────────────
/**
 * Fetches new posts from a subreddit.
 * Strategy: try RSS first (avoids auth requirement); if that returns
 * a 4xx error (common for small/regional subreddits like r/ioe),
 * fall back to the JSON API endpoint.
 */
async function fetchNewPosts(subreddit: string): Promise<RedditPost[]> {
  const rssUrl = `https://www.reddit.com/r/${subreddit}/new.rss`;
  const jsonUrl = `https://www.reddit.com/r/${subreddit}/new.json?limit=25`;

  // ── Attempt 1: RSS feed ──────────────────────────────────────
  try {
    const client = buildRedditClient();
    const response = await client.get<string>(rssUrl, { responseType: 'text' });
    const posts = parseRssFeed(response.data, subreddit);
    console.log(`[scraper] Fetched ${posts.length} posts from r/${subreddit} (RSS)`);
    return posts;
  } catch (rssErr: any) {
    const status = rssErr?.response?.status;
    const isClientError = status && status >= 400 && status < 500;

    if (isClientError) {
      // RSS is not available for this subreddit — try JSON API
      console.warn(
        `[scraper] RSS returned ${status} for r/${subreddit}. Falling back to JSON API...`
      );
    } else {
      // Network error, timeout, or 5xx — not a fallback case
      console.error(`[scraper] Failed to fetch r/${subreddit} via RSS:`, rssErr?.message ?? rssErr);
      return [];
    }
  }

  // ── Attempt 2: JSON API (fallback) ───────────────────────────
  try {
    const client = buildRedditClient();
    const response = await client.get<any>(jsonUrl);
    const posts = parseJsonFeed(response.data, subreddit);
    console.log(`[scraper] Fetched ${posts.length} posts from r/${subreddit} (JSON API fallback)`);
    return posts;
  } catch (jsonErr: any) {
    console.error(
      `[scraper] JSON API fallback also failed for r/${subreddit}: `,
      jsonErr?.message ?? jsonErr
    );
    return [];
  }
}

// ─── Deduplication Check ──────────────────────────────────────
/**
 * Filters out Reddit posts that are already in ingested_posts.
 * Uses a single IN-query for efficiency rather than per-post lookups.
 */
async function filterAlreadySeen(posts: RedditPost[]): Promise<RedditPost[]> {
  if (posts.length === 0) return [];

  const postNames = posts.map((p) => p.name); // e.g. ["t3_abc", "t3_xyz"]

  const { data: existing, error } = await supabase
    .from('ingested_posts')
    .select('reddit_post_id')
    .in('reddit_post_id', postNames);

  if (error) {
    console.error('[scraper] Dedup query error:', error);
    return []; // Fail safe — skip batch on DB error
  }

  const seenIds = new Set((existing ?? []).map((row) => row.reddit_post_id));
  const fresh = posts.filter((p) => !seenIds.has(p.name));

  console.log(
    `[scraper] Dedup: ${posts.length} fetched → ${fresh.length} new, ` +
      `${posts.length - fresh.length} already seen`
  );

  return fresh;
}

// ─── Mark Posts as Ingested ───────────────────────────────────
async function markAsIngested(posts: RedditPost[], subreddit: string): Promise<void> {
  if (posts.length === 0) return;

  const rows = posts.map((p) => ({
    reddit_post_id: p.name,
    subreddit,
  }));

  const { error } = await supabase.from('ingested_posts').insert(rows);

  if (error) {
    // Log but don't crash — dedup is best-effort
    console.error('[scraper] Failed to mark posts as ingested:', error);
  }
}

// ─── Heuristic Keyword Filter ─────────────────────────────────
/**
 * Zero-cost pre-filter: a post must satisfy BOTH conditions:
 *   1. It contains at least one project-specific keyword (topic relevance)
 *   2. It contains at least one buying-signal phrase (intent signal)
 *
 * Multi-word keywords (e.g. "Assignment tracking") are expanded into
 * individual word tokens so each individual word can independently
 * trigger a keyword match. This avoids false negatives where a post
 * about "tracking assignments" doesn't contain the exact phrase
 * "Assignment tracking" but is clearly relevant.
 *
 * Stop-words (a, the, to, of, for, in, and, or, with) are excluded
 * from single-token expansion to avoid matching everything.
 */

// Words too generic to use as standalone keyword tokens
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'for', 'in', 'and', 'or', 'with',
  'is', 'it', 'my', 'your', 'i', 'am', 'are', 'be', 'as', 'on',
  'at', 'by', 'up', 'do', 'so', 'we', 'me',
]);

function expandKeywords(keywords: string[]): string[] {
  const expanded: string[] = [];
  for (const kw of keywords) {
    const lower = kw.toLowerCase().trim();
    expanded.push(lower); // always keep the full phrase
    // If multi-word, also add each meaningful individual word
    const words = lower.split(/\s+/);
    if (words.length > 1) {
      for (const word of words) {
        if (word.length >= 4 && !STOP_WORDS.has(word)) {
          expanded.push(word);
        }
      }
    }
  }
  return [...new Set(expanded)]; // deduplicate
}

function passesHeuristicFilter(
  post: RedditPost,
  productProfile: { keywords: string[]; customerSignals: string[] } | null,
  projectKeywords: string[]
): boolean {
  const searchText = `${post.title} ${post.selftext}`.toLowerCase();

  // Combine DB-stored project keywords with AI-generated profile keywords/signals
  const rawKeywords = [
    ...projectKeywords,
    ...(productProfile?.keywords ?? []),
    ...(productProfile?.customerSignals ?? []),
  ];

  // Expand multi-word phrases into individual tokens as well
  const allKeywords = expandKeywords(rawKeywords);

  // Condition 1: Must match at least one product keyword (full phrase OR single token)
  const matchedKeyword = allKeywords.find((kw) => searchText.includes(kw));
  if (!matchedKeyword) return false; // ← Fast path: reject non-relevant posts immediately

  // Condition 2: Must also show a buying-intent signal
  const matchedSignal = BUYING_SIGNAL_PHRASES.find((phrase) =>
    searchText.includes(phrase.toLowerCase())
  );

  if (!matchedSignal) return false;

  // Log what triggered the match for debugging
  console.log(
    `[scraper] 🔍 Heuristic matched keyword="${matchedKeyword}" signal="${matchedSignal}" in "${post.title.slice(0, 60)}"`
  );

  return true;
}

// ─── Context Cache ────────────────────────────────────────────
/**
 * Returns a validated ProductProfile for a project.
 * Uses JSON-serialized cache from Supabase product_context column.
 * On cache miss (or failed parse), scrapes + generates fresh profile.
 */
async function ensureProductContext(project: Project): Promise<ProductProfile | null> {
  // ── Cache hit: try to parse stored JSON back to ProductProfile ─
  if (project.product_context && project.product_context.trim().length > 0) {
    const cached = parseStoredProductProfile(project.product_context);
    if (cached) {
      console.log(`[scraper] ✅ Using cached product profile for "${project.company_name}"`);
      return cached;
    }
    // Falls through to re-generate if stored value fails Zod validation
  }

  console.log(
    `[scraper] No valid cached profile for "${project.company_name}". ` +
      `Scraping ${project.website_url}...`
  );

  let profile: ProductProfile;

  try {
    profile = await scrapeProductContext(project.website_url);
  } catch (err) {
    console.error(
      `[scraper] contextScraper failed for ${project.website_url}:`,
      err instanceof Error ? err.message : err
    );
    return null; // Cannot proceed without a valid profile — skip this post
  }

  // Serialize to JSON string for Supabase TEXT column
  const serialized = JSON.stringify(profile);

  const { error } = await supabase
    .from('projects')
    .update({ product_context: serialized })
    .eq('id', project.id);

  if (error) {
    console.error('[scraper] Failed to persist product_context to Supabase:', error);
  } else {
    console.log(
      `[scraper] ✅ Persisted product profile for "${project.company_name}" ` +
        `(${profile.keywords.length} keywords, ${profile.customerSignals.length} signals)`
    );
    project.product_context = serialized; // Update in-memory copy for this cycle
  }

  return profile;
}

// ─── Core Processing Pipeline ─────────────────────────────────
/**
 * Processes a single fresh Reddit post against all matching projects.
 */
async function processPostForProjects(
  post: RedditPost,
  matchingProjects: Project[]
): Promise<void> {
  for (const project of matchingProjects) {
    // ── Heuristic pre-filter (zero AI cost) ───────────────────
    // Get the cached product profile (if available) for richer keyword matching
    const cachedProfile = project.product_context
      ? (() => {
          try { return JSON.parse(project.product_context); } catch { return null; }
        })()
      : null;

    if (!passesHeuristicFilter(post, cachedProfile, project.keywords)) {
      console.log(
        `[scraper] ⏭  Heuristic miss → "${post.title.slice(0, 50)}" ` +
          `(project: ${project.company_name})`
      );
      continue;
    }

    console.log(
      `[scraper] ✓ Heuristic hit → "${post.title.slice(0, 50)}" ` +
        `(project: ${project.company_name})`
    );

    // ── Ensure product profile (Phase 2: returns typed ProductProfile) ─
    const productProfile = await ensureProductContext(project);
    if (!productProfile) {
      console.log('[scraper] Could not resolve product profile — skipping post.');
      continue;
    }

    // ── Gemini intent classification (Phase 2: passes ProductProfile) ─
    let intentResult: IntentResult | null;
    try {
      intentResult = await classifyPostIntent(post, productProfile);
    } catch (err) {
      console.error('[scraper] Intent classification threw:', err);
      continue;
    }

    if (!intentResult) {
      console.log('[scraper] Intent processor returned null — skipping.');
      continue;
    }

    // ── Threshold gate: priorityScore >= 70 AND buyingSignalStrength >= 7 ─
    // This dual gate eliminates general_discussion posts (capped at priority 40)
    // and weak-signal posts. Both conditions must be true simultaneously.
    const passesGate =
      intentResult.priorityScore >= 70 &&
      intentResult.buyingSignalStrength >= 7;

    if (!passesGate) {
      console.log(
        `[scraper] ⬇  Below threshold → ` +
          `priority=${intentResult.priorityScore}/70 | ` +
          `signal=${intentResult.buyingSignalStrength}/7 | ` +
          `type=${intentResult.intentType} — stored but not alerted.`
      );
      continue;
    }

    // ── High-intent confirmed — log + dispatch ─────────────────
    console.log('\n' + '='.repeat(60));
    console.log('[scraper] 🔥 HIGH-INTENT LEAD DETECTED');
    console.log(
      JSON.stringify(
        {
          post: post.title,
          subreddit: `r/${post.subreddit}`,
          url: `https://www.reddit.com${post.permalink}`,
          intentType: intentResult.intentType,
          priority: intentResult.priorityScore,
          buyingSignal: intentResult.buyingSignalStrength,
          confidence: intentResult.confidenceScore,
          painLevel: intentResult.painLevel,
          summary: intentResult.opportunitySummary,
        },
        null,
        2
      )
    );
    console.log('='.repeat(60) + '\n');

    // ── Save Opportunity to Supabase ─────────────────────────
    try {
      const { error: dbError } = await supabase
        .from('opportunities')
        .insert({
          user_id: project.user_id,
          project_id: project.id,
          reddit_post_id: post.name,
          title: post.title,
          selftext: post.selftext,
          author: post.author,
          permalink: post.permalink,
          subreddit: post.subreddit,
          priority_score: Math.round(intentResult.priorityScore),
          intent_type: intentResult.intentType,
          opportunity_summary: intentResult.opportunitySummary,
          fit_reason: intentResult.fitReason,
          suggested_replies: intentResult.suggestedReplies,
          status: 'new',
        });

      if (dbError) {
        console.error('[scraper] Failed to save opportunity to database:', dbError);
      } else {
        console.log(`[scraper] Saved opportunity to database for project "${project.company_name}"`);
      }
    } catch (dbErr) {
      console.error('[scraper] Error saving opportunity to DB:', dbErr);
    }

    try {
      await sendTelegramAlert({ project, post, intentResult });
    } catch (err) {
      console.error('[scraper] Telegram dispatch failed:', err);
    }
  }
}

// ─── Main Poll Cycle ──────────────────────────────────────────
/**
 * One full sweep: loads all projects, fetches new posts from every
 * tracked subreddit, deduplicates, and runs the processing pipeline.
 */
async function runPollCycle(): Promise<void> {
  console.log(`\n[scraper] ── Poll cycle started at ${new Date().toISOString()} ──`);

  // Load all active projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*');

  if (projectsError) {
    console.error('[scraper] Failed to load projects:', projectsError);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('[scraper] No projects found. Add a project row to public.projects.');
    return;
  }

  console.log(`[scraper] Loaded ${projects.length} project(s).`);

  // Build a map: subreddit → projects that track it
  const subredditProjectMap = new Map<string, Project[]>();

  for (const project of projects as Project[]) {
    for (const sub of project.subreddits) {
      const normalized = sub.toLowerCase().trim();
      if (!subredditProjectMap.has(normalized)) {
        subredditProjectMap.set(normalized, []);
      }
      subredditProjectMap.get(normalized)!.push(project);
    }
  }

  // Process each unique subreddit once
  for (const [subreddit, matchingProjects] of subredditProjectMap.entries()) {
    // Fetch new posts
    const rawPosts = await fetchNewPosts(subreddit);
    if (rawPosts.length === 0) continue;

    // Deduplicate against DB
    const freshPosts = await filterAlreadySeen(rawPosts);
    if (freshPosts.length === 0) {
      console.log(`[scraper] No new posts in r/${subreddit} this cycle.`);
      continue;
    }

    // Mark all fresh posts as ingested BEFORE processing
    // (prevents re-processing if an error occurs mid-loop)
    await markAsIngested(freshPosts, subreddit);

    // Run each fresh post through the pipeline
    for (const post of freshPosts) {
      await processPostForProjects(post, matchingProjects);
    }
  }

  console.log(`[scraper] ── Poll cycle complete at ${new Date().toISOString()} ──\n`);
}

// ─── Public Entry Point ───────────────────────────────────────
/**
 * Starts the SignalHop ingestion engine.
 * Runs an immediate first cycle, then repeats every POLL_INTERVAL_MS.
 */
export function startScraper(): void {
  console.log('[scraper] 🚀 SignalHop scraper initializing...');

  supabase = initSupabase();

  console.log(
    `[scraper] Supabase connected. Poll interval: ${POLL_INTERVAL_MS / 1000}s`
  );

  // Run immediately, then on the interval
  runPollCycle().catch((err) => {
    console.error('[scraper] First poll cycle failed:', err);
  });

  setInterval(() => {
    runPollCycle().catch((err) => {
      console.error('[scraper] Scheduled poll cycle failed:', err);
    });
  }, POLL_INTERVAL_MS);
}
