// ============================================================
//  src/contextScraper.ts — Landing Page Parser & Product Profiler
//
//  Responsibilities:
//  1. Download a product landing page with Axios
//  2. Strip noise (nav, footer, scripts, styles) via Cheerio
//  3. Extract: title, meta description, first 4000 chars of text
//  4. Send to OpenRouter LLM with JSON mode
//  5. Validate output with Zod before returning
//  6. Return typed ProductProfile — never a raw string
// ============================================================

import axios from 'axios';
import * as cheerio from 'cheerio';
import { ProductProfile, ProductProfileSchema } from './types';
import { callJsonLLM, getLLMProvider } from './llm';
import 'dotenv/config';

const MAX_TEXT_CHARS = 4_000;
const FETCH_TIMEOUT_MS = 15_000;

// ─── HTTP Client ──────────────────────────────────────────────
const httpClient = axios.create({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

// ─── Step 1: Download and clean page HTML ─────────────────────
interface PageContent {
  title: string;
  description: string;
  bodyText: string;
}

async function fetchAndCleanPage(url: string): Promise<PageContent> {
  let html: string;

  try {
    const response = await httpClient.get<string>(url, { responseType: 'text' });
    html = response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        `HTTP fetch failed for ${url}: ${err.response?.status ?? 'network error'} — ${err.message}`
      );
    }
    throw new Error(`Unexpected fetch error for ${url}: ${String(err)}`);
  }

  const $ = cheerio.load(html);

  // Remove noise elements that inflate token count without adding signal
  $('script, style, nav, footer, header, noscript, iframe, svg, [aria-hidden="true"]').remove();

  const title =
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    new URL(url).hostname;

  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    '';

  const rawText = $('body').text();
  const bodyText = rawText
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_CHARS);

  return { title, description: description.trim(), bodyText };
}

// ─── Step 2: Call LLM and validate output ─────────────────────
async function generateProductProfile(
  url: string,
  title: string,
  description: string,
  bodyText: string
): Promise<ProductProfile> {
  const systemPrompt = `You are an expert product analyst. Extract a structured JSON product profile from a web page.

Be specific and factual. Do not invent features not present in the content.

You MUST return a valid JSON object with EXACTLY these fields:
{
  "productName": "string — name of the product or company",
  "oneLineDescription": "string — one sentence describing what the product does",
  "targetAudience": ["array of strings — ideal customer types or personas"],
  "problemsSolved": ["array of strings — specific pain points this product addresses"],
  "keywords": ["array of strings — search/discovery terms a customer would use to find this"],
  "industries": ["array of strings — industries or verticals this product serves"],
  "customerSignals": ["array of strings — realistic phrases someone would write on Reddit or a forum when they need this product. Think buying-intent phrases."]
}

Return ONLY the JSON object. No markdown. No explanation.`;

  const userPrompt = `Page URL: ${url}
Page Title: ${title}
Meta Description: ${description}
Page Content (first ${MAX_TEXT_CHARS} chars of visible text):
${bodyText}`;

  const rawText = await callJsonLLM(systemPrompt, userPrompt, 'contextScraper', 0.3);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${rawText.slice(0, 200)}`);
  }

  const validation = ProductProfileSchema.safeParse(parsed);
  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Product profile failed Zod validation: ${issues}`);
  }

  return validation.data;
}

// ─── Public Entry Point ───────────────────────────────────────

/**
 * Scrapes a product landing page and returns a structured ProductProfile.
 * All AI output is validated with Zod before being returned.
 */
export async function scrapeProductContext(websiteUrl: string): Promise<ProductProfile> {
  console.log(`[contextScraper] 🌐 Fetching landing page: ${websiteUrl}`);

  const { title, description, bodyText } = await fetchAndCleanPage(websiteUrl);

  console.log(
    `[contextScraper] Extracted ${bodyText.length} chars. ` +
      `Title: "${title.slice(0, 60)}". Sending to ${getLLMProvider().toUpperCase()}...`
  );

  const profile = await generateProductProfile(websiteUrl, title, description, bodyText);

  console.log(
    `[contextScraper] ✅ Product profile generated for "${profile.productName}" ` +
      `| ${profile.keywords.length} keywords | ${profile.customerSignals.length} customer signals`
  );

  return profile;
}

/**
 * Parses a JSON string from Supabase back into a typed ProductProfile.
 * Returns null if the stored value is missing or fails validation.
 */
export function parseStoredProductProfile(raw: string | null): ProductProfile | null {
  if (!raw || raw.trim().length === 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[contextScraper] Stored product_context is not valid JSON — will re-generate.');
    return null;
  }

  const validation = ProductProfileSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn('[contextScraper] Stored product_context failed Zod validation — will re-generate.');
    return null;
  }

  return validation.data;
}
