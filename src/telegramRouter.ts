// ============================================================
//  src/telegramRouter.ts — Telegram Bot API Dispatch Engine
//
//  Responsibilities:
//  - Format enriched IntentResult into a Telegram MarkdownV2 message
//  - Attach an inline keyboard with "Open Reddit Thread" URL button
//  - Send via Telegram Bot API
//  - NO scoring or intent logic here — that belongs in intentProcessor.ts
// ============================================================

import axios from 'axios';
import { AlertPayload } from './types';
import 'dotenv/config';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

// ─── MarkdownV2 Escaper ───────────────────────────────────────
function escMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\-]/g, '\\$&');
}

// ─── Style Label Map ──────────────────────────────────────────
const STYLE_LABELS: Record<string, string> = {
  educational:  '📖 Draft 1 — Educational',
  discussion:   '💬 Draft 2 — Discussion',
  soft_mention: '🌱 Draft 3 — Soft Mention',
};

// ─── Signal Bar Renderer ──────────────────────────────────────
function signalBar(value: number, max: number = 10): string {
  const filled = Math.round((value / max) * 5);
  return '█'.repeat(filled) + '░'.repeat(5 - filled);
}

// ─── Intent Type Emoji ────────────────────────────────────────
const INTENT_EMOJI: Record<string, string> = {
  purchase_decision:     '💰',
  tool_comparison:       '⚖️',
  solution_search:       '🔍',
  recommendation_request:'🙋',
  implementation_help:   '🔧',
  problem_complaint:     '😤',
  general_discussion:    '💭',
};

// ─── Message Formatter ────────────────────────────────────────
/**
 * Builds a Telegram MarkdownV2-safe alert message.
 * Respects Telegram's 4096-char hard limit via body truncation.
 */
function formatAlertMessage(payload: AlertPayload): string {
  const { project, post, intentResult } = payload;

  const confidence = (intentResult.confidenceScore * 100).toFixed(0);
  const priority   = intentResult.priorityScore;
  const intentLabel = intentResult.intentType.replace(/_/g, ' ');
  const intentEmoji = INTENT_EMOJI[intentResult.intentType] ?? '📌';

  const bodyPreview = escMd(
    (post.selftext || '[no body text]').slice(0, 400)
  );
  const postTitle   = escMd(post.title);
  const companyName = escMd(project.company_name);
  const summary     = escMd(intentResult.opportunitySummary);
  const fitReason   = escMd(intentResult.fitReason);
  const postUrl     = `https://www.reddit.com${post.permalink}`;

  // Reply drafts
  const replyBlocks = intentResult.suggestedReplies.map((r) => {
    const label     = STYLE_LABELS[r.style] ?? `Draft — ${r.style}`;
    const replyText = escMd(r.reply);
    return [
      `*${escMd(label)}:*`,
      `\`\`\``,
      replyText,
      `\`\`\``,
    ].join('\n');
  });

  const lines = [
    `🔥 *Huntly Lead Alert*`,
    ``,
    `📌 *Project:* ${companyName}`,
    `🟥 *Subreddit:* r/${escMd(post.subreddit)}`,
    `${intentEmoji} *Intent:* ${escMd(intentLabel)}`,
    ``,
    `📊 *Scores*`,
    `Priority:    ${signalBar(priority, 100)} ${priority}/100`,
    `Buy Signal:  ${signalBar(intentResult.buyingSignalStrength)} ${intentResult.buyingSignalStrength}/10`,
    `Pain Level:  ${signalBar(intentResult.painLevel)} ${intentResult.painLevel}/10`,
    `Confidence:  ${signalBar(intentResult.confidenceScore, 1)} ${confidence}%`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `*Post:* [${postTitle}](${escMd(postUrl)})`,
    ``,
    `*Preview:*`,
    `> ${bodyPreview}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🎯 *Opportunity Summary:*`,
    `_${summary}_`,
    ``,
    `💡 *Why This Fits ${companyName}:*`,
    `_${fitReason}_`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `💬 *Reply Drafts \\(copy\\-paste inside Reddit\\):*`,
    ``,
    replyBlocks.join('\n\n'),
  ];

  const full = lines.join('\n');

  // Telegram hard limit is 4096 chars — truncate gracefully
  if (full.length > 4_000) {
    return full.slice(0, 3_950) + '\n\n_\\[message truncated\\]_';
  }

  return full;
}

// ─── Inline Keyboard Builder ──────────────────────────────────
/**
 * Builds a Telegram inline keyboard with an "Open Reddit Thread" button.
 * The button opens the original Reddit thread URL directly in the browser.
 */
function buildInlineKeyboard(post: AlertPayload['post']) {
  const threadUrl = `https://www.reddit.com${post.permalink}`;
  return {
    inline_keyboard: [
      [
        {
          text: '🔗 Open Reddit Thread',
          url: threadUrl,
        },
      ],
    ],
  };
}

// ─── Telegram Dispatch ────────────────────────────────────────
/**
 * Sends a formatted alert to a Telegram chat with an inline keyboard.
 *
 * Credential resolution order:
 *  1. project.webhook_url containing a full Telegram API endpoint
 *  2. TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env vars (fallback)
 */
export async function sendTelegramAlert(payload: AlertPayload): Promise<void> {
  const { project, post } = payload;

  let botToken: string | undefined;
  let chatId: string | undefined;

  if (project.webhook_url?.startsWith('https://api.telegram.org/bot')) {
    const match = project.webhook_url.match(/bot([^/]+)\//);
    if (match) botToken = match[1];
    chatId = process.env.TELEGRAM_CHAT_ID;
  } else {
    botToken = process.env.TELEGRAM_BOT_TOKEN;
    chatId   = process.env.TELEGRAM_CHAT_ID;
  }

  if (!botToken || !chatId) {
    console.error(
      '[telegramRouter] Missing bot token or chat ID. ' +
        'Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env or populate project.webhook_url.'
    );
    return;
  }

  const endpoint   = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;
  const message    = formatAlertMessage(payload);
  const keyboard   = buildInlineKeyboard(post);

  try {
    await axios.post(endpoint, {
      chat_id:                  chatId,
      text:                     message,
      parse_mode:               'MarkdownV2',
      disable_web_page_preview: true,
      reply_markup:             keyboard,
    });

    console.log(
      `[telegramRouter] ✅ Alert dispatched → "${payload.post.title.slice(0, 50)}" ` +
        `| priority=${payload.intentResult.priorityScore} | type=${payload.intentResult.intentType}`
    );
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.error(
        '[telegramRouter] Telegram API error:',
        err.response?.status,
        JSON.stringify(err.response?.data)
      );
    } else {
      console.error('[telegramRouter] Unexpected dispatch error:', err);
    }
  }
}
