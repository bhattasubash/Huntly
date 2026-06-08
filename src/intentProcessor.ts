// ============================================================
//  src/intentProcessor.ts — Structured Intent Classifier
//
//  Responsibilities:
//  1. Accept a Reddit post + ProductProfile
//  2. Call LLM with strict JSON mode via shared llm.ts client
//  3. Enforce priority score caps per intent type (no inflation)
//  4. Validate ALL output with Zod before returning
//  5. Return enriched IntentResult with opportunitySummary
//
//  Core philosophy: "Could this person realistically become a
//  customer in the near future?" — NOT "Does this post mention
//  a relevant topic?" Topic relevance alone is NOT enough.
// ============================================================

import { z } from 'zod';
import {
  RedditPost,
  ProductProfile,
  IntentResult,
  IntentResultSchema,
} from './types';
import { callJsonLLM } from './llm';
import 'dotenv/config';

// ─── Priority Score Caps Per Intent Type ─────────────────────
// Hard caps enforced AFTER LLM output — prevents the model from
// inflating general discussions to priority scores that would
// trigger Telegram alerts.
const PRIORITY_CAPS: Record<string, number> = {
  general_discussion:    40,   // brainstorming, wishlists, polls — almost never leads
  problem_complaint:     65,   // pain exists but not actively shopping
  implementation_help:   70,   // relevant but not an immediate buyer
  recommendation_request: 85,  // strong buying signal
  tool_comparison:       90,   // very strong buying signal
  solution_search:       90,   // actively seeking a solution
  purchase_decision:    100,   // highest value — ready to buy
};

// Confidence caps per type — general_discussion should never be "certain"
const CONFIDENCE_CAPS: Record<string, number> = {
  general_discussion: 0.60,
  problem_complaint:  0.80,
  implementation_help: 0.85,
  recommendation_request: 0.95,
  tool_comparison: 0.95,
  solution_search: 0.95,
  purchase_decision: 1.00,
};

// ─── Intent Type Fallback Guard ───────────────────────────────
const VALID_INTENT_TYPES = new Set([
  'solution_search',
  'tool_comparison',
  'problem_complaint',
  'recommendation_request',
  'purchase_decision',
  'implementation_help',
  'general_discussion',
]);

// ─── Domain Expertise Deriver ────────────────────────────────
/**
 * Derives a plain-English expertise block from the ProductProfile.
 * This tells the model WHAT the product specializes in so it can
 * write replies that sound like a knowledgeable domain expert —
 * not a generic AI assistant.
 */
function deriveExpertise(profile: ProductProfile): string {
  const lines: string[] = [];

  lines.push(`Product: ${profile.productName}`);
  lines.push(`One-line: ${profile.oneLineDescription}`);
  lines.push(``);
  lines.push(`Domain expertise this product represents:`);

  // Pull expertise from the problems the product solves
  for (const problem of profile.problemsSolved) {
    lines.push(`  • ${problem}`);
  }

  lines.push(``);
  lines.push(`Target audience: ${profile.targetAudience.join(', ')}`);
  lines.push(`Industries: ${profile.industries.join(', ')}`);

  return lines.join('\n');
}

// ─── Prompt Builder ───────────────────────────────────────────
function buildIntentPrompt(post: RedditPost, profile: ProductProfile): {
  system: string;
  user: string;
} {
  const expertiseBlock = deriveExpertise(profile);

  const system = `You are a senior sales intelligence analyst AND a domain expert in the product area described below.

Your role has two parts:

PART 1 — INTENT ANALYSIS
Answer: "Could this Reddit user realistically become a customer in the near future?"
Topic relevance alone is NOT enough. Buying intent is the primary signal.

PART 2 — PRODUCT-AWARE REPLY GENERATION
Write replies as someone who deeply understands the product's domain and the user's specific situation.
Do NOT write generic advice. Write like an expert in this field who knows this product exists.

## PRODUCT DOMAIN EXPERTISE

${expertiseBlock}

## INTENT CATEGORIES

Classify into exactly ONE:

solution_search       — actively seeking a tool/solution
tool_comparison       — comparing options, evaluating alternatives
purchase_decision     — ready or nearly ready to buy
recommendation_request — asking what tool/app others use
implementation_help   — asking how to use a tool (existing user)
problem_complaint     — expressing frustration (may indicate future intent)
general_discussion    — brainstorming, wishlists, polls, no purchase intent

## PRIORITY SCORING RULES (NON-NEGOTIABLE CAPS)

general_discussion:     priorityScore MAX = 40,  confidenceScore MAX = 0.60
problem_complaint:      priorityScore MAX = 65,  confidenceScore MAX = 0.80
implementation_help:    priorityScore MAX = 70,  confidenceScore MAX = 0.85
recommendation_request: priorityScore MAX = 85
tool_comparison:        priorityScore MAX = 90
solution_search:        priorityScore MAX = 90
purchase_decision:      priorityScore MAX = 100

## BUYING SIGNAL STRENGTH (0–10)

0–2: No buying intent (general chat, brainstorming)
3–5: Weak (frustration, vague curiosity)
6–7: Moderate (actively exploring options)
8–9: Strong (comparing tools, near-decision)
10:  Immediate (explicit "I need to buy now")

## OPPORTUNITY SUMMARY

2 concise sentences, max 40 words.
Sentence 1: What the user is doing and their intent level.
Sentence 2: Why this is or is not an opportunity for this specific product.

## FIT REASON

1-2 sentences explaining WHY this post is relevant to the product's domain.
Be specific — reference the product's expertise and the user's actual situation.
Example: "User is choosing between academic programs, which directly aligns with [product]'s career counseling and program selection expertise."

## PRODUCT-AWARE REPLY GENERATION

Generate exactly 3 replies. Each must:
  - Reference the user's ACTUAL situation (not a generic restatement)
  - Demonstrate expertise in the product's domain
  - Feel like a genuine Reddit comment from a knowledgeable person in this field
  - NOT sound like marketing, AI-generated content, or a product pitch

BEFORE writing each reply, ask yourself:
  "What would a real expert in this domain — who also knows this product exists — say to this person?"
  "Am I using domain-specific knowledge, or am I giving generic advice?"

CONCRETE QUALITY STANDARD:
  Bad: "have you thought about what you want to achieve in the next 5-10 years?"
  Good: "since you enjoy math, i'd compare what each path opens up — actuarial science is
         heavily tied to risk and insurance, BEcon leans toward policy and research, and
         CM gives a stronger quantitative computing foundation. depends which type of work
         you see yourself doing post-grad."

The "Good" example is specific, uses domain knowledge, and directly addresses the user's situation.

ABSOLUTE PROHIBITIONS:
  - NEVER say "I use [product name]", "I switched to...", "My team uses...", "I've been using..."
  - NEVER fabricate personal product usage or customer testimonials
  - NEVER use emojis
  - NEVER use corporate buzzwords (game-changer, leverage, synergy, revolutionize)
  - NEVER start with fake enthusiasm (Great question! Hey there! As a fellow...)
  - NEVER write motivational fluff without substance
  - NEVER repeat the original post back to the user

REQUIRED STYLE:
  - Casual first-person Reddit voice
  - Lowercase is fine, contractions are good, brevity is valued
  - Genuine value and domain insight FIRST — always
  - Product mention only in soft_mention style, and only if it fits naturally

Reply styles:
  1. "educational" — Share a domain-specific insight, tip, or reframe grounded in the product's expertise. No product mention.
  2. "discussion"  — Ask one sharp, insightful follow-up question that only a domain expert would think to ask. No product mention.
  3. "soft_mention" — Give genuine domain-specific help first, then naturally mention the product as one option worth exploring (not THE answer, just an option).

## OUTPUT FORMAT

Return ONLY a valid JSON object:
{
  "isHighIntent": boolean,
  "confidenceScore": number (0.0–1.0, respect caps),
  "priorityScore": number (integer 0–100, respect caps),
  "intentType": "solution_search" | "tool_comparison" | "problem_complaint" | "recommendation_request" | "purchase_decision" | "implementation_help" | "general_discussion",
  "buyingSignalStrength": number (integer 0–10),
  "painLevel": number (integer 0–10),
  "opportunitySummary": "string (max 2 sentences, ~40 words)",
  "fitReason": "string (1-2 sentences, product-specific relevance explanation)",
  "suggestedReplies": [
    { "style": "educational", "reply": "string" },
    { "style": "discussion",  "reply": "string" },
    { "style": "soft_mention","reply": "string" }
  ]
}

Return ONLY the JSON. No markdown. No explanation outside the JSON.`;

  const user = `## PRODUCT PROFILE
Product: ${profile.productName}
What it does: ${profile.oneLineDescription}
Target audience: ${profile.targetAudience.join(', ')}
Problems it solves: ${profile.problemsSolved.join('; ')}
Industries: ${profile.industries.join(', ')}
Known buying signals:
${profile.customerSignals.map((s) => `  • "${s}"`).join('\n')}

## REDDIT POST
Subreddit: r/${post.subreddit}
Title: ${post.title}
Body:
${post.selftext || '[no body text — title only post]'}

---

## YOUR TASK

Step 1 — Assess intent:
  Is this person actively seeking a solution, or just discussing ideas?
  Are they comparing tools or ready to decide?
  Be conservative. Default to general_discussion or problem_complaint if in doubt.

Step 2 — Explain fit:
  In fitReason, explain specifically why this post is or isn't relevant to the product.
  Reference the product's domain expertise and the user's actual situation.

Step 3 — Generate product-aware replies:
  Write replies as if you are a genuine expert in the product's domain.
  Use the specific details in this post — program names, subjects, situations.
  Do NOT write generic advice that ignores the post's specifics.
  Each reply must demonstrate domain knowledge, not just general helpfulness.`;

  return { system, user };
}

// ─── Hard Cap Enforcer ────────────────────────────────────────
/**
 * Applies strict priority and confidence caps per intent type.
 * This runs AFTER LLM output to prevent model inflation.
 */
function applyIntentCaps(raw: Record<string, unknown>): void {
  const intentType = typeof raw.intentType === 'string' ? raw.intentType : 'general_discussion';

  const maxPriority = PRIORITY_CAPS[intentType] ?? 100;
  const maxConfidence = CONFIDENCE_CAPS[intentType] ?? 1.0;

  if (typeof raw.priorityScore === 'number') {
    raw.priorityScore = Math.min(raw.priorityScore, maxPriority);
  }
  if (typeof raw.confidenceScore === 'number') {
    raw.confidenceScore = Math.min(raw.confidenceScore, maxConfidence);
  }

  // general_discussion is NEVER high intent
  if (intentType === 'general_discussion') {
    raw.isHighIntent = false;
  }
}

// ─── Zod Post-Processing ──────────────────────────────────────
function validateIntentResult(raw: unknown): IntentResult | null {
  if (typeof raw === 'object' && raw !== null) {
    const record = raw as Record<string, unknown>;

    // Normalize intentType casing and handle unknowns
    if (typeof record.intentType === 'string') {
      const normalized = record.intentType.toLowerCase().replace(/\s+/g, '_');
      record.intentType = VALID_INTENT_TYPES.has(normalized)
        ? normalized
        : 'general_discussion';
    }

    // Apply hard priority/confidence caps based on intent type
    applyIntentCaps(record);

    // Clamp numeric fields to valid ranges
    if (typeof record.confidenceScore === 'number') {
      record.confidenceScore = Math.max(0, Math.min(1, record.confidenceScore));
    }
    if (typeof record.priorityScore === 'number') {
      record.priorityScore = Math.max(0, Math.min(100, Math.round(record.priorityScore)));
    }
    if (typeof record.buyingSignalStrength === 'number') {
      record.buyingSignalStrength = Math.max(0, Math.min(10, Math.round(record.buyingSignalStrength)));
    }
    if (typeof record.painLevel === 'number') {
      record.painLevel = Math.max(0, Math.min(10, Math.round(record.painLevel)));
    }

    // Normalize reply styles — map any legacy values to new names
    const STYLE_MAP: Record<string, string> = {
      personal:  'discussion',
      soft_sell: 'soft_mention',
    };
    if (Array.isArray(record.suggestedReplies)) {
      record.suggestedReplies = record.suggestedReplies
        .slice(0, 3)
        .map((r: unknown) => {
          if (typeof r === 'object' && r !== null) {
            const reply = r as Record<string, unknown>;
            if (typeof reply.style === 'string') {
              const normalized = reply.style.toLowerCase().replace(/\s+/g, '_');
              reply.style = STYLE_MAP[normalized] ?? normalized;
            }
            return reply;
          }
          return r;
        });
    }
  }

  const result = IntentResultSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(' | ');
    console.error(`[intentProcessor] Zod validation failed: ${issues}`);
    return null;
  }

  return result.data;
}

// ─── Public Entry Point ───────────────────────────────────────

/**
 * Classifies a Reddit post against a product profile.
 * Applies hard priority caps per intent type to prevent false positives.
 * Returns null on any failure.
 */
export async function classifyPostIntent(
  post: RedditPost,
  profile: ProductProfile
): Promise<IntentResult | null> {
  try {
    console.log(
      `[intentProcessor] 🧠 Classifying: "${post.title.slice(0, 70)}..."`
    );

    const { system, user } = buildIntentPrompt(post, profile);

    const rawText = await callJsonLLM(system, user, 'intentProcessor', 0.3);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error(
        `[intentProcessor] LLM returned invalid JSON: ${rawText.slice(0, 300)}`
      );
      return null;
    }

    const result = validateIntentResult(parsed);
    if (!result) return null;

    console.log(
      `[intentProcessor] ✅ Result → isHighIntent=${result.isHighIntent} | ` +
        `confidence=${result.confidenceScore.toFixed(2)} | ` +
        `priority=${result.priorityScore} | ` +
        `type=${result.intentType} | ` +
        `signal=${result.buyingSignalStrength}/10 | ` +
        `pain=${result.painLevel}/10`
    );
    console.log(`[intentProcessor] 📋 Summary: ${result.opportunitySummary}`);
    console.log(`[intentProcessor] 🎯 Fit: ${result.fitReason}`);

    return result;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(`[intentProcessor] LLM API error: ${err.message}`);
    } else {
      console.error('[intentProcessor] Unknown error during classification:', err);
    }
    return null;
  }
}
