/**
 * AI-powered lead enrichment using OpenAI with web search
 * Takes raw lead data and company context, returns structured persona
 */

import OpenAI from 'openai';
import { z } from 'zod';
import type { EnrichedLeadData } from '../types';

const AllowedLeadCategories = ['influencer', 'coach', 'blog', 'agency', 'podcast', 'other'] as const;

function normalizeLeadCategory(value: unknown): typeof AllowedLeadCategories[number] {
  const s = String(value || '').trim().toLowerCase();
  if (s.includes('agency') || s.includes('marketing') || s.includes('advertising')) return 'agency';
  if (s.includes('coach') || s.includes('consultant') || s.includes('advisor')) return 'coach';
  if (s.includes('podcast') || s.includes('host')) return 'podcast';
  if (s.includes('blog') || s.includes('writer') || s.includes('newsletter')) return 'blog';
  if (s.includes('influencer') || s.includes('creator') || s.includes('speaker')) return 'influencer';
  return 'other';
}

function normalizePublishedEmail(value: unknown): string | null {
  if (value == null) return null;
  const email = String(value).trim();
  if (!email) return null;
  // Reject masked, redacted, placeholder, or otherwise non-sendable addresses.
  if (/[*…]/.test(email) || /\.{2,}/.test(email) || /\[(?:at|dot)\]/i.test(email)) return null;
  if (/^(?:n\/a|none|null|unknown)$/i.test(email)) return null;
  return email;
}

const EnrichedLeadSchema = z.object({
  category: z.preprocess(normalizeLeadCategory, z.enum(AllowedLeadCategories)),
  full_name: z.string().catch('Unknown'),
  title: z.string().catch(''),
  bio: z.string().catch(''),
  expertise: z.array(z.string()).catch([]),
  social_links: z.record(z.unknown()).catch({}),
  total_audience: z.number().catch(0),
  content_types: z.array(z.string()).catch([]),
  promotion_fit_score: z.number().catch(5),
  promotion_fit_reason: z.string().catch(''),
  email: z.preprocess(normalizePublishedEmail, z.string().email().nullable()).catch(null),
});

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required');
  return new OpenAI({ apiKey });
}

export async function enrichLead(
  leadData: Record<string, unknown>,
  companyContext: { name: string; description: string; targetAudience: string }
): Promise<EnrichedLeadData> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are a lead enrichment specialist. You'll receive raw data about a lead discovered from web searches, plus context about the company reaching out to them.

Parse everything you're given, then use web search to fill in any gaps.

Your task:
1. Figure out who this lead is from the raw data
2. Find their contact email only if the exact address is explicitly visible in the raw data or on a web page you actually access. Never construct, infer, pattern-guess, or fabricate an email address. If no exact published email is found, return null.
3. Find social media profiles and audience sizes
4. Understand what content they create
5. Score how good a fit they are for the company

Be thorough but concise. Use web search for anything not in the raw data.`;

  const userPrompt = `Enrich this lead:

**Raw Lead Data:**
${JSON.stringify(leadData, null, 2).slice(0, 5000)}

**Company Context (who wants to reach them):**
- Company: ${companyContext.name}
- What they do: ${companyContext.description}
- Target audience: ${companyContext.targetAudience}

Return JSON with these fields:
1. **category**: What they are (influencer, coach, blog, agency, podcast, or anything else that fits)
2. **full_name**: Their actual name
3. **title**: Professional title (e.g., "Acting Coach", "Podcast Host")
4. **bio**: 2-3 sentence summary
5. **expertise**: Array of expertise areas
6. **social_links**: Object with social profile URLs (use null for missing ones)
7. **total_audience**: Total followers/subscribers across platforms (number)
8. **content_types**: Array of content they create
9. **promotion_fit_score**: 1-10 fit score for ${companyContext.name}
10. **promotion_fit_reason**: Brief explanation
11. **email**: A contact email address only when you found the exact address explicitly published in the raw data or a web source you accessed. Never guess an address from a person's name or company domain. Return null if there is no explicit published email.

Return ONLY valid JSON.`;

  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    tools: [{ type: 'web_search_preview' }],
    input: `${systemPrompt}\n\n${userPrompt}`,
  });

  const responseText = response.output_text || '';

  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return EnrichedLeadSchema.parse(parsed) as EnrichedLeadData;
  } catch (error) {
    console.error('Failed to parse enrichment response:', responseText);
    throw new Error(`Failed to parse lead enrichment: ${error}`);
  }
}
