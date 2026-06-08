'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const ProductProfileSchema = z.object({
  productName: z.string().min(1),
  oneLineDescription: z.string().min(1),
  targetAudience: z.array(z.string()).min(1),
  problemsSolved: z.array(z.string()).min(1),
  keywords: z.array(z.string()).min(1),
  industries: z.array(z.string()).min(1),
  customerSignals: z.array(z.string()).min(1),
});

export type ProductProfile = z.infer<typeof ProductProfileSchema>;

// Initialize Google Gen AI client with server API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Scrapes and cleans a landing page.
 */
async function fetchAndCleanPage(url: string) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
  });

  const $ = cheerio.load(response.data);
  $('script, style, nav, footer, header, noscript, iframe, svg, [aria-hidden="true"]').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || new URL(url).hostname;
  const description = $('meta[name="description"]').attr('content') || '';
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);

  return { title, description, bodyText };
}

/**
 * Server Action: Scrapes website and suggestions subreddits.
 */
export async function analyzeWebsite(url: string, companyName: string) {
  try {
    const { title, description, bodyText } = await fetchAndCleanPage(url);

    // 1. Generate Product Profile
    const profilePrompt = `You are an expert product analyst. Extract a structured JSON product profile from a web page.
Be specific and factual. Do not invent features not present in the content.

You MUST return a valid JSON object matching this schema:
{
  "productName": "string — name of the product or company",
  "oneLineDescription": "string — one sentence describing what the product does",
  "targetAudience": ["array of strings — ideal customer types or personas"],
  "problemsSolved": ["array of strings — specific pain points this product addresses"],
  "keywords": ["array of strings — search/discovery terms a customer would use to find this"],
  "industries": ["array of strings — industries or verticals this product serves"],
  "customerSignals": ["array of strings — realistic phrases someone would write on Reddit when they need this product."]
}`;

    const profileResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        profilePrompt,
        `Page URL: ${url}\nTitle: ${title}\nDescription: ${description}\nContent:\n${bodyText}`
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const profileText = profileResponse.text;
    if (!profileText) throw new Error('No response from Gemini for product profile');

    const parsedProfile = JSON.parse(profileText);
    const profile = ProductProfileSchema.parse(parsedProfile);

    // If company name was provided, ensure it overrides LLM name if LLM returned something generic
    if (companyName && (!profile.productName || profile.productName.toLowerCase() === 'product')) {
      profile.productName = companyName;
    }

    // 2. Suggest Subreddits
    const subredditPrompt = `You are a Reddit marketing and social listening expert.
Suggest 5 to 8 specific, real, active subreddits where target customers would hang out, ask questions, share complaints, or request recommendations.

You MUST return a valid JSON object with this schema:
{
  "subreddits": ["array of 5 to 8 lowercase subreddit names WITHOUT the r/ prefix"]
}`;

    const subResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        subredditPrompt,
        `Product Profile:\n- Name: ${profile.productName}\n- Description: ${profile.oneLineDescription}\n- Target Audience: ${profile.targetAudience.join(', ')}\n- Problems Solved: ${profile.problemsSolved.join(', ')}\n- Industries: ${profile.industries.join(', ')}`
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const subText = subResponse.text;
    if (!subText) throw new Error('No response from Gemini for subreddit suggestions');
    
    const parsedSubs = JSON.parse(subText);
    const rawSubs: string[] = parsedSubs.subreddits || [];

    const subreddits = Array.from(
      new Set(
        rawSubs
          .map((s) => s.toLowerCase().trim().replace(/^r\//i, '').replace(/[^a-z0-9_]/g, ''))
          .filter((s) => s.length > 0)
      )
    );

    return { success: true, profile, subreddits };
  } catch (error: any) {
    console.error('analyzeWebsite action error:', error);
    return { success: false, error: error.message || 'Failed to analyze website.' };
  }
}

/**
 * Server Action: Save project to Supabase.
 */
export async function saveProject(
  companyName: string,
  websiteUrl: string,
  profile: ProductProfile,
  subreddits: string[]
) {
  try {
    const supabase = await createServerSideClient();
    
    // Get logged-in user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        company_name: companyName,
        website_url: websiteUrl,
        product_context: JSON.stringify(profile),
        keywords: profile.keywords,
        subreddits: subreddits,
        webhook_url: '',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, project: data };
  } catch (error: any) {
    console.error('saveProject action error:', error);
    return { success: false, error: error.message || 'Failed to save project.' };
  }
}

/**
 * Server Action: Delete a project.
 */
export async function deleteProject(id: string) {
  try {
    const supabase = await createServerSideClient();
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('deleteProject action error:', error);
    return { success: false, error: error.message || 'Failed to delete project.' };
  }
}
