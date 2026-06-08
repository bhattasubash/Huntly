// ============================================================
//  src/setup.ts — Interactive CLI for Automated Onboarding
// ============================================================

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { onboardProduct, saveOnboardedProject } from './projectSetup';
import 'dotenv/config';

// ─── Formatting Helpers ───────────────────────────────────────
const COLOR_BLUE = '\x1b[34m';
const COLOR_GREEN = '\x1b[32m';
const COLOR_YELLOW = '\x1b[33m';
const COLOR_CYAN = '\x1b[36m';
const COLOR_RED = '\x1b[31m';
const COLOR_RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function printHeader(title: string) {
  console.log(`\n${BOLD}${COLOR_CYAN}=== ${title} ===${COLOR_RESET}\n`);
}

function printSuccess(msg: string) {
  console.log(`\n${BOLD}${COLOR_GREEN}✅ ${msg}${COLOR_RESET}\n`);
}

function printError(msg: string) {
  console.log(`\n${BOLD}${COLOR_RED}❌ Error: ${msg}${COLOR_RESET}\n`);
}

// ─── Input Validator ─────────────────────────────────────────
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Main CLI Loop ────────────────────────────────────────────
async function main() {
  const rl = readline.createInterface({ input, output });

  console.log(`
╔═══════════════════════════════════════════╗
║           S I G N A L H O P               ║
║      Automated Project Onboarding         ║
╚═══════════════════════════════════════════╝
`);

  try {
    // 1. Get Company Name
    let companyName = '';
    while (!companyName.trim()) {
      companyName = await rl.question(`${BOLD}Enter your company or product name (e.g. Zentro):${COLOR_RESET} `);
      if (!companyName.trim()) {
        console.log(`${COLOR_YELLOW}Company name cannot be empty. Please try again.${COLOR_RESET}`);
      }
    }

    // 2. Get Website URL
    let websiteUrl = '';
    while (true) {
      let rawUrl = await rl.question(`${BOLD}Enter your landing page URL (e.g. https://tryzentro.vercel.app):${COLOR_RESET} `);
      rawUrl = rawUrl.trim();

      // Prepend https:// if not specified
      if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
        rawUrl = `https://${rawUrl}`;
      }

      if (isValidUrl(rawUrl)) {
        websiteUrl = rawUrl;
        break;
      } else {
        console.log(`${COLOR_YELLOW}Invalid URL format. Please make sure to enter a valid website link.${COLOR_RESET}`);
      }
    }

    printHeader('Analyzing Landing Page & Discovering Leads');
    console.log(`${COLOR_BLUE}🌐 Parsing ${websiteUrl}...${COLOR_RESET}`);
    console.log(`${COLOR_BLUE}🧠 Scanning page content & identifying target audience subreddits...${COLOR_RESET}`);

    // 3. Trigger analysis logic (context scraping + Gemini analysis)
    const { profile, subreddits } = await onboardProduct(websiteUrl, companyName);

    // 4. Present discovered product context
    printHeader('Product Profile Discovered');
    console.log(`${BOLD}Product Name:${COLOR_RESET}       ${COLOR_GREEN}${profile.productName}${COLOR_RESET}`);
    console.log(`${BOLD}Description:${COLOR_RESET}        ${profile.oneLineDescription}`);
    
    console.log(`\n${BOLD}Target Audience Persona(s):${COLOR_RESET}`);
    profile.targetAudience.forEach((persona) => console.log(`  • ${persona}`));

    console.log(`\n${BOLD}Discovered Industries:${COLOR_RESET}`);
    profile.industries.forEach((ind) => console.log(`  • ${ind}`));

    console.log(`\n${BOLD}Problems Solved:${COLOR_RESET}`);
    profile.problemsSolved.forEach((prob) => console.log(`  • ${prob}`));

    printHeader('Subreddits & Keywords to Monitor');
    
    console.log(`${BOLD}Target Keywords (${profile.keywords.length}):${COLOR_RESET}`);
    console.log(`  ${COLOR_CYAN}${profile.keywords.join(', ')}${COLOR_RESET}`);

    console.log(`\n${BOLD}AI-Discovered Subreddits to Track (${subreddits.length}):${COLOR_RESET}`);
    if (subreddits.length === 0) {
      console.log(`  ${COLOR_YELLOW}No specific subreddits found. Defaulting to general startup/SaaS subs.${COLOR_RESET}`);
      subreddits.push('saas', 'microsaas', 'sideproject');
    }
    console.log(`  ${COLOR_GREEN}${subreddits.map(s => `r/${s}`).join(', ')}${COLOR_RESET}`);

    // 5. Ask for Confirmation
    console.log('');
    const confirm = await rl.question(`${BOLD}Do you want to save this project and start listening for leads? (y/n):${COLOR_RESET} `);
    
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      console.log(`\n${COLOR_BLUE}💾 Saving project to Supabase...${COLOR_RESET}`);
      
      const project = await saveOnboardedProject(companyName, websiteUrl, profile, subreddits);
      
      printSuccess(`Project "${project.company_name}" successfully onboarded!`);
      console.log(`${BOLD}Project ID:${COLOR_RESET}   ${project.id}`);
      console.log(`${BOLD}Website URL:${COLOR_RESET}  ${project.website_url}`);
      console.log(`${BOLD}Monitoring:${COLOR_RESET}   ${COLOR_GREEN}${project.subreddits.length} subreddits${COLOR_RESET} with ${COLOR_CYAN}${project.keywords.length} keywords${COLOR_RESET}`);
      console.log(`\n💡 The running scraper (${COLOR_YELLOW}npm run dev${COLOR_RESET}) will pick up this project on its next poll cycle.`);
    } else {
      console.log(`\n${COLOR_YELLOW}Onboarding cancelled. Project was not saved.${COLOR_RESET}\n`);
    }

  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
  } finally {
    rl.close();
  }
}

main();
