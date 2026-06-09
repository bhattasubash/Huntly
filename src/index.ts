// ============================================================
//  src/index.ts — Huntly Entry Point
//
//  Validates environment, then starts the scraper loop.
// ============================================================

import 'dotenv/config';
import { startScraper } from './scraper';

// ─── Environment Validation ───────────────────────────────────
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
];

function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  // Ensure at least one LLM API key is present
  const hasLLMKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!hasLLMKey) {
    missing.push('GROQ_API_KEY or GEMINI_API_KEY or OPENROUTER_API_KEY (at least one LLM key is required)');
  }

  if (missing.length > 0) {
    console.error('\n❌ Huntly cannot start — missing environment variables:');
    missing.forEach((key) => console.error(`   • ${key}`));
    console.error('\nCopy .env.example → .env and fill in your credentials.\n');
    process.exit(1);
  }

  console.log('✅ Environment validated — all required keys present.');
}

// ─── Boot ─────────────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════╗
║           S I G N A L H O P               ║
║   Reddit Lead Intelligence Co-Pilot       ║
╚═══════════════════════════════════════════╝
`);

validateEnvironment();
startScraper();

// ─── Graceful Shutdown ────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[huntly] Received SIGINT — shutting down gracefully.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[huntly] Received SIGTERM — shutting down gracefully.');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('[huntly] Unhandled promise rejection:', reason);
  // Do NOT exit — keep the loop alive
});
