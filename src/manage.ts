// ============================================================
//  src/manage.ts — Project Management CLI
//
//  Single responsibility: list and delete projects from Supabase.
//  Run with:
//    npm run manage          → lists all projects
//    npm run manage delete   → interactive delete
// ============================================================

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const CYAN  = '\x1b[36m';
const YELLOW= '\x1b[33m';
const RESET = '\x1b[0m';

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const mode = process.argv[2]; // 'delete' or undefined (list)

  // ── List all projects ─────────────────────────────────────
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, company_name, website_url, subreddits, keywords, created_at')
    .order('created_at', { ascending: true });

  if (error) { console.error('Error fetching projects:', error); process.exit(1); }

  if (!projects || projects.length === 0) {
    console.log('\n⚠️  No projects found in the database.\n');
    process.exit(0);
  }

  console.log(`\n${BOLD}${CYAN}Active Projects (${projects.length})${RESET}\n`);
  projects.forEach((p, i) => {
    console.log(`${BOLD}[${i + 1}] ${p.company_name}${RESET}`);
    console.log(`    ID:         ${p.id}`);
    console.log(`    URL:        ${p.website_url}`);
    console.log(`    Subreddits: ${GREEN}${p.subreddits?.map((s: string) => `r/${s}`).join(', ')}${RESET}`);
    console.log(`    Keywords:   ${p.keywords?.join(', ')}`);
    console.log(`    Created:    ${new Date(p.created_at).toLocaleString()}`);
    console.log('');
  });

  if (mode !== 'delete') {
    console.log(`💡 Run ${YELLOW}npm run manage delete${RESET} to delete a project.\n`);
    process.exit(0);
  }

  // ── Delete flow ───────────────────────────────────────────
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `${BOLD}Enter the number of the project to delete (or "cancel"):${RESET} `
    );

    if (answer.toLowerCase() === 'cancel' || answer.trim() === '') {
      console.log('\nCancelled. No projects were deleted.\n');
      process.exit(0);
    }

    const idx = parseInt(answer.trim(), 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= projects.length) {
      console.log(`\n${RED}Invalid selection. Aborting.${RESET}\n`);
      process.exit(1);
    }

    const target = projects[idx];
    const confirm = await rl.question(
      `\n${RED}Delete "${target.company_name}" (${target.id})? This cannot be undone. (y/n):${RESET} `
    );

    if (confirm.toLowerCase() !== 'y') {
      console.log('\nAborted. No changes made.\n');
      process.exit(0);
    }

    const { error: delErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', target.id);

    if (delErr) {
      console.error(`${RED}Error deleting project:${RESET}`, delErr);
      process.exit(1);
    }

    console.log(`\n${GREEN}✅ "${target.company_name}" deleted successfully.${RESET}\n`);
    console.log(`💡 Stop and restart ${YELLOW}npm run dev${RESET} to apply the change immediately.\n`);
  } finally {
    rl.close();
  }
}

main();
