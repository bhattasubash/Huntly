// ============================================================
//  src/projectSetup.ts — Onboarding Logic & AI Subreddit Discovery
// ============================================================

import { z } from 'zod';
import { scrapeProductContext } from './contextScraper';
import { ProductProfile, Project } from './types';
import { insertProject } from './db';
import { callJsonLLM } from './llm';
import 'dotenv/config';

// ─── Zod Schema for Validation ────────────────────────────────
const SubredditSuggestionsSchema = z.object({
  subreddits: z.array(z.string().min(1)).min(3).max(12),
});

/**
 * Uses OpenRouter to suggest 5 to 8 highly targeted, real subreddits
 * based on the structured product profile.
 */
export async function suggestSubreddits(profile: ProductProfile): Promise<string[]> {
  console.log(`[projectSetup] 🧠 Querying AI for targeted subreddits...`);

  const systemPrompt = `You are a Reddit marketing and social listening expert.

Analyze the product profile and suggest 5 to 8 specific, real, active subreddits where target customers would hang out, ask questions, share complaints, or request recommendations.

You MUST return a valid JSON object with EXACTLY this schema:
{
  "subreddits": ["array of 5 to 8 lowercase subreddit names WITHOUT the r/ prefix"]
}

Guidelines:
1. ONLY suggest real, active subreddits that exist on Reddit.
2. DO NOT suggest generic high-noise subreddits (AskReddit, funny, pics, news, etc.).
3. Focus on niche-specific communities relevant to the product's target audience.
4. Return names lowercase, without the "r/" prefix (e.g., "saas", "nepal", "entrepreneur").

Return ONLY the JSON object. No markdown. No explanation.`;

  const userPrompt = `Product Profile:
- Name: ${profile.productName}
- Description: ${profile.oneLineDescription}
- Target Audience: ${profile.targetAudience.join(', ')}
- Problems Solved: ${profile.problemsSolved.join(', ')}
- Industries: ${profile.industries.join(', ')}
- Customer Signals: ${profile.customerSignals.join(', ')}`;

  const rawText = await callJsonLLM(systemPrompt, userPrompt, 'projectSetup', 0.4);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Invalid JSON returned by LLM: ${rawText}`);
  }

  const validation = SubredditSuggestionsSchema.safeParse(parsed);
  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Subreddit suggestions failed Zod validation: ${issues}`);
  }

  // Clean, trim, lowercase, and deduplicate
  const cleanSubs = Array.from(
    new Set(
      validation.data.subreddits
        .map((sub) => sub.toLowerCase().trim().replace(/^r\//i, '').replace(/[^a-z0-9_]/g, ''))
        .filter((sub) => sub.length > 0)
    )
  );

  return cleanSubs;
}

/**
 * Onboarding Coordinator: Scrapes product context and suggests subreddits.
 */
export async function onboardProduct(
  url: string,
  companyName: string
): Promise<{ profile: ProductProfile; subreddits: string[] }> {
  // 1. Scrape landing page and generate ProductProfile
  const profile = await scrapeProductContext(url);

  // If the scraped productName is empty or generic, use the user-supplied name
  if (
    !profile.productName ||
    profile.productName.toLowerCase() === 'product' ||
    profile.productName.toLowerCase() === 'company'
  ) {
    profile.productName = companyName;
  }

  // 2. Query AI for subreddit suggestions based on the profile
  const subreddits = await suggestSubreddits(profile);

  return { profile, subreddits };
}

/**
 * Saves the onboarded project to Supabase via the DB helper.
 */
export async function saveOnboardedProject(
  companyName: string,
  websiteUrl: string,
  profile: ProductProfile,
  subreddits: string[]
): Promise<Project> {
  const projectData: Omit<Project, 'id' | 'created_at'> = {
    user_id: '00000000-0000-0000-0000-000000000001',
    company_name: companyName,
    website_url: websiteUrl,
    product_context: JSON.stringify(profile),
    keywords: profile.keywords,
    subreddits: subreddits,
    webhook_url: '',
  };

  return insertProject(projectData);
}
