// ============================================================
//  src/llm.ts — Shared Multi-Provider LLM Client
//
//  Single responsibility: provide a unified, rate-limited LLM
//  interface with automatic provider fallback.
//
//  Provider priority (configurable via .env):
//    1. Groq           — llama-3.3-70b-versatile (100k TPD free)
//    2. Gemini         — gemini-2.5-flash (15 RPM / 1M TPD free)
//    3. OpenRouter     — gemma free tier (fallback)
//
//  Fallback behaviour:
//    If the active provider exhausts its daily quota (429 with
//    "tokens per day" or "free-models-per-day"), the system
//    automatically switches to the next available provider for
//    the remainder of the process lifetime. This eliminates
//    the situation where exhausting Groq kills all AI calls
//    for the rest of the day.
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { OpenAI } from 'openai';
import 'dotenv/config';

// ─── Provider Registry ────────────────────────────────────────
type ProviderName = 'groq' | 'gemini' | 'openrouter';

interface ProviderConfig {
  name: ProviderName;
  model: string;
  client: OpenAI | GoogleGenAI | null;
  exhausted: boolean;
}

// Build the ordered list of configured providers
const providers: ProviderConfig[] = [];

if (process.env.GROQ_API_KEY) {
  providers.push({
    name:      'groq',
    model:     process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    client:    new OpenAI({
      apiKey:  process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    }),
    exhausted: false,
  });
}

if (process.env.GEMINI_API_KEY) {
  providers.push({
    name:      'gemini',
    model:     process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    client:    new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
    exhausted: false,
  });
}

if (process.env.OPENROUTER_API_KEY) {
  providers.push({
    name:    'openrouter',
    model:   process.env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free',
    client:  new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/huntly',
        'X-Title':      'Huntly',
      },
    }),
    exhausted: false,
  });
}

if (providers.length === 0) {
  throw new Error(
    'No LLM API keys found. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY in .env'
  );
}

// ─── Active Provider Pointer ──────────────────────────────────
let activeIndex = 0;

function getActiveProvider(): ProviderConfig | null {
  // Find the first non-exhausted provider starting from current
  for (let i = activeIndex; i < providers.length; i++) {
    if (!providers[i].exhausted) return providers[i];
  }
  // Wrap around: check earlier providers in case they refreshed
  for (let i = 0; i < activeIndex; i++) {
    if (!providers[i].exhausted) return providers[i];
  }
  return null;
}

function markExhausted(providerName: ProviderName): void {
  const idx = providers.findIndex((p) => p.name === providerName);
  if (idx !== -1) {
    providers[idx].exhausted = true;
    console.warn(
      `[llm] 🔴 ${providerName.toUpperCase()} daily quota exhausted — switching provider.`
    );
    // Advance active index to next available
    for (let i = 0; i < providers.length; i++) {
      if (!providers[i].exhausted) {
        activeIndex = i;
        console.log(
          `[llm] 🔀 Switched to ${providers[i].name.toUpperCase()} | Model: ${providers[i].model}`
        );
        return;
      }
    }
    console.error('[llm] 🔴 ALL providers exhausted. No further LLM calls can be made today.');
  }
}

// Log startup state
const primary = providers[0];
console.log(
  `[llm] 🤖 Primary: ${primary.name.toUpperCase()} | Model: ${primary.model}` +
  (providers.length > 1
    ? ` | Fallback(s): ${providers.slice(1).map((p) => p.name.toUpperCase()).join(' → ')}`
    : '')
);

// ─── Exported provider info (for logging elsewhere) ──────────
export function getLLMProvider(): string {
  return getActiveProvider()?.name ?? 'none';
}
export function getLLMModel(): string {
  return getActiveProvider()?.model ?? 'none';
}

// ─── Shared Rate Limiter ──────────────────────────────────────
const MIN_CALL_GAP_MS = 2_500;
let lastCallTime = 0;

async function acquireRateLimit(caller: string): Promise<void> {
  const now     = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_CALL_GAP_MS) {
    const wait = MIN_CALL_GAP_MS - elapsed;
    console.log(`[${caller}] ⏳ Rate-limit pause: ${wait}ms`);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastCallTime = Date.now();
}

// ─── Quota Exhaustion Detector ────────────────────────────────
function isQuotaExhausted(err: unknown): boolean {
  const msg = (err as any)?.message ?? '';
  return (
    msg.includes('tokens per day') ||
    msg.includes('free-models-per-day') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('exceeded') ||
    (msg.includes('429') && msg.includes('day'))
  );
}

function isTransientRateLimit(err: unknown): boolean {
  const msg    = (err as any)?.message ?? '';
  const status = (err as any)?.status;
  return (
    status === 429 ||
    (msg.includes('429') && !isQuotaExhausted(err)) ||
    msg.includes('rate limit')
  );
}

// ─── Single Provider Call ─────────────────────────────────────
async function callWithProvider(
  provider: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  const { name, model, client } = provider;

  if (name === 'groq' || name === 'openrouter') {
    const oai    = client as OpenAI;
    const result = await oai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    });
    return result.choices[0]?.message?.content ?? '';
  }

  if (name === 'gemini') {
    const gemini   = client as GoogleGenAI;
    const response = await gemini.models.generateContent({
      model,
      contents: [{
        role:  'user',
        parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
      }],
      config: { responseMimeType: 'application/json', temperature },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  throw new Error(`Unknown provider: ${name}`);
}

// ─── Public JSON Call Entry Point ─────────────────────────────
/**
 * Calls the active LLM with JSON mode enabled.
 * Automatically falls back to the next provider on quota exhaustion.
 * Retries transient rate limits (RPM) with backoff on the same provider.
 *
 * @param systemPrompt - System instruction
 * @param userPrompt   - User payload
 * @param caller       - Module name for logging (e.g. 'intentProcessor')
 * @param temperature  - Sampling temperature (default 0.3)
 */
export async function callJsonLLM(
  systemPrompt: string,
  userPrompt: string,
  caller: string,
  temperature = 0.3
): Promise<string> {
  const RPM_RETRY_DELAYS = [10_000, 20_000, 40_000]; // milliseconds

  // Outer loop: try each provider in fallback order
  while (true) {
    const provider = getActiveProvider();
    if (!provider) {
      throw new Error(`[${caller}] All LLM providers are exhausted. Cannot proceed.`);
    }

    await acquireRateLimit(caller);

    let rpmAttempt = 0;

    // Inner loop: retry transient RPM limits on the same provider
    while (rpmAttempt <= RPM_RETRY_DELAYS.length) {
      try {
        const text = await callWithProvider(provider, systemPrompt, userPrompt, temperature);

        if (!text || text.trim().length === 0) {
          throw new Error(`${provider.name.toUpperCase()} returned an empty response.`);
        }

        return text;
      } catch (err: unknown) {
        if (isQuotaExhausted(err)) {
          // Daily quota gone — mark provider and break to outer loop (try next provider)
          markExhausted(provider.name);
          break;
        }

        if (isTransientRateLimit(err) && rpmAttempt < RPM_RETRY_DELAYS.length) {
          const delay = RPM_RETRY_DELAYS[rpmAttempt];
          console.warn(
            `[${caller}] ⚠️  RPM limit on ${provider.name.toUpperCase()}. ` +
            `Retrying in ${delay / 1000}s (attempt ${rpmAttempt + 1}/${RPM_RETRY_DELAYS.length})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          rpmAttempt++;
          await acquireRateLimit(caller);
          continue;
        }

        // Non-retriable error — surface immediately
        throw err;
      }
    }
    // If we broke out of inner loop due to quota exhaustion, outer loop
    // will call getActiveProvider() again to get the next fallback.
  }
}
