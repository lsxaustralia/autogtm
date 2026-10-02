import { getExaClient } from '@autogtm/core/clients/exa';
import { inngest } from '@/inngest/client';

function platformFromUrl(url: string): string {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('youtube.com')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return 'other';
}

function canonicalProfileUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);

    if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
      const idx = parts.indexOf('in');
      if (idx >= 0 && parts[idx + 1]) {
        return `https://www.linkedin.com/in/${parts[idx + 1]}/`;
      }
      return null;
    }

    if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
      const first = parts[0];
      const reserved = new Set(['p', 'reel', 'reels', 'tv', 'explore', 'accounts', 'stories', 'direct']);
      if (!first || reserved.has(first.toLowerCase())) return null;
      return `https://www.instagram.com/${first}/`;
    }

    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      const handle = parts.find((p) => p.startsWith('@'));
      return handle ? `https://www.tiktok.com/${handle}` : null;
    }

    if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host === 'music.youtube.com') {
      if (host === 'youtu.be' || host === 'music.youtube.com') return null;
      if (parts[0]?.startsWith('@')) return `https://www.youtube.com/${parts[0]}`;
      if (['channel', 'c', 'user'].includes(parts[0]) && parts[1]) {
        return `https://www.youtube.com/${parts[0]}/${parts[1]}`;
      }
      return null;
    }

    if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.twitter.com')) {
      const first = parts[0];
      const reserved = new Set(['home', 'explore', 'search', 'i', 'intent', 'share', 'messages', 'notifications']);
      if (!first || reserved.has(first.toLowerCase())) return null;
      return `https://x.com/${first}`;
    }

    return rawUrl;
  } catch {
    return null;
  }
}


function extractResultLocation(result: any): string | null {
  const entities = Array.isArray(result?.entities) ? result.entities : [];
  for (const entity of entities) {
    const props = entity?.properties;
    if (props?.location && typeof props.location === 'string') return props.location;
    const history = Array.isArray(props?.workHistory) ? props.workHistory : [];
    for (const job of history) {
      if (job?.location && typeof job.location === 'string') return job.location;
    }
  }
  return null;
}

function isAustraliaLocation(location: string | null): boolean {
  if (!location) return false;
  const l = location.toLowerCase();
  const markers = [
    'australia',
    'new south wales', 'nsw',
    'queensland', 'qld',
    'victoria', 'vic',
    'western australia', 'wa',
    'south australia', 'sa',
    'tasmania', 'tas',
    'australian capital territory', 'act',
    'northern territory', 'nt',
    'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide',
    'canberra', 'hobart', 'darwin', 'gold coast', 'sunshine coast',
    'newcastle', 'wollongong', 'geelong'
  ];
  return markers.some((marker) => l.includes(marker));
}

function matchesTargetCountry(location: string | null, targetCountry: string): boolean {
  const target = (targetCountry || '').trim().toLowerCase();
  if (!target) return true;
  if (target === 'australia' || target === 'au') return isAustraliaLocation(location);
  return !!location && location.toLowerCase().includes(target);
}

function cleanLeadName(result: any, canonicalUrl: string): string {
  const title = String(result?.title || '').trim();
  const author = String(result?.author || '').trim();

  if (title && !['Instagram', 'YouTube', 'TikTok', 'LinkedIn'].includes(title)) {
    return title
      .split(/\s+on Instagram:/i)[0]
      .split(/\s+on TikTok:/i)[0]
      .replace(/\s*[•·]\s*(?:Instagram|TikTok)\s+(?:photos|fotos)(?:\s+(?:and|y)\s+(?:videos|vídeos))?.*$/i, '')
      .replace(/\s+- YouTube$/i, '')
      .replace(/\s+\| LinkedIn$/i, '')
      .trim()
      .slice(0, 120);
  }

  if (author) return author.slice(0, 180);

  try {
    const url = new URL(canonicalUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const handle = parts.find((p) => p.startsWith('@')) || parts[parts.length - 1] || 'Unknown';
    return handle.replace(/^@/, '').replace(/[-_]/g, ' ').slice(0, 180);
  } catch {
    return 'Unknown';
  }
}

async function runSearchApiFallback(supabase: any, query: any) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error('EXA_API_KEY is required');

  const criteria = Array.isArray(query.criteria) ? query.criteria : [];
  const { data: companyConfig } = await supabase
    .from('companies')
    .select('target_country')
    .eq('id', query.company_id)
    .single();
  const targetCountry = String(companyConfig?.target_country || 'Australia');
  const lower = String(query.query || '').toLowerCase();
  const isSocialQuery =
    lower.includes('linkedin') ||
    lower.includes('instagram') ||
    lower.includes('youtube') ||
    lower.includes('tiktok') ||
    lower.includes('twitter') ||
    lower.includes(' x ');

  const searchText = [
    query.query,
    ...criteria.map((c: string) => `Criterion: ${c}`),
    `Location requirement: the person must be located in ${targetCountry}. This is mandatory.`,
    isSocialQuery
      ? 'Return actual person or creator profile pages. Prefer profile/home pages over individual posts, reels, videos, playlists, or articles.'
      : 'Return actual people or company decision makers suitable for direct outreach, not generic articles.',
  ].join('. ');

  const requestBody: Record<string, any> = {
    query: searchText,
    type: 'auto',
    numResults: isSocialQuery ? 50 : 30,
    contents: { highlights: true },
  };

  if (lower.includes('linkedin')) {
    requestBody.category = 'people';
    requestBody.includeDomains = ['linkedin.com'];
  } else if (lower.includes('youtube')) {
    requestBody.includeDomains = ['youtube.com'];
  } else if (lower.includes('instagram')) {
    requestBody.includeDomains = ['instagram.com'];
  } else if (lower.includes('tiktok')) {
    requestBody.includeDomains = ['tiktok.com'];
  } else if (lower.includes('twitter') || lower.includes(' x ')) {
    requestBody.includeDomains = ['x.com', 'twitter.com'];
  }

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const payload: any = await response.json();

  if (!response.ok) {
    await supabase
      .from('exa_queries')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', query.id);
    throw new Error(
      `Exa Search API failed (${response.status}): ${payload?.error || payload?.message || JSON.stringify(payload)}`
    );
  }

  const rawResults = Array.isArray(payload?.results) ? payload.results : [];
  const seenProfiles = new Set<string>();
  const prospects: Array<{ canonicalUrl: string; result: any }> = [];

  for (const result of rawResults) {
    const rawUrl = String(result?.url || '');
    const canonicalUrl = canonicalProfileUrl(rawUrl);
    if (!canonicalUrl || seenProfiles.has(canonicalUrl)) continue;

    const platform = platformFromUrl(canonicalUrl);
    if (isSocialQuery && platform === 'other') continue;

    const location = extractResultLocation(result);
    if (!matchesTargetCountry(location, targetCountry)) continue;

    seenProfiles.add(canonicalUrl);
    prospects.push({ canonicalUrl, result: { ...result, __resolved_location: location, __resolved_country: targetCountry } });
    if (prospects.length >= 10) break;
  }

  const runId = `search-api-${Date.now()}`;
  const now = new Date().toISOString();

  const { data: websetRun, error: websetRunError } = await supabase
    .from('webset_runs')
    .insert({
      query_id: query.id,
      webset_id: runId,
      status: 'completed',
      items_found: prospects.length,
      started_at: now,
      completed_at: now,
    })
    .select('id')
    .single();

  if (websetRunError) throw websetRunError;

  const urls = prospects.map((p) => p.canonicalUrl);
  let existingUrls = new Set<string>();
  if (urls.length > 0) {
    const { data: existing } = await supabase.from('leads').select('url').in('url', urls);
    existingUrls = new Set((existing || []).map((r: any) => String(r.url)));
  }

  const rows = prospects
    .filter((p) => !existingUrls.has(p.canonicalUrl))
    .map(({ canonicalUrl, result }) => ({
      query_id: query.id,
      webset_run_id: websetRun.id,
      name: cleanLeadName(result, canonicalUrl),
      email: null,
      url: canonicalUrl,
      platform: platformFromUrl(canonicalUrl),
      follower_count: null,
      location: result?.__resolved_location || null,
      country: targetCountry,
      enrichment_data: {
        ...result,
        original_result_url: result?.url || null,
        canonical_profile_url: canonicalUrl,
      },
      enrichment_status: 'pending',
      campaign_status: 'pending',
    }));

  let insertedLeads: any[] = [];
  if (rows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('leads')
      .insert(rows)
      .select('id, url, email, name');
    if (insertError) throw insertError;
    insertedLeads = inserted || [];
  }

  await supabase
    .from('exa_queries')
    .update({ status: 'completed', last_run_at: now, updated_at: now })
    .eq('id', query.id);

  if (insertedLeads.length > 0) {
    try {
      const enrichmentEvents = insertedLeads.map((lead: any) => ({
        name: 'autogtm/lead.created' as const,
        data: {
          leadId: lead.id,
          leadUrl: lead.url,
          leadEmail: lead.email,
          leadName: lead.name,
          companyId: query.company_id,
          manualTest: true,
        },
      }));
      await inngest.send(enrichmentEvents);
    } catch (error) {
      console.error('Search succeeded but failed to enqueue lead enrichment:', error);
    }
  }

  return {
    websetId: runId,
    status: 'completed' as const,
    message: `Search completed with ${prospects.length} profile prospects and ${insertedLeads.length} new leads.`,
    leadsFound: insertedLeads.length,
  };
}

export async function startQueryRun(
  supabase: any,
  queryId: string
): Promise<{ websetId: string; status: 'running' | 'completed'; message: string; leadsFound?: number }> {
  const { data: query, error: queryError } = await supabase
    .from('exa_queries')
    .select('*')
    .eq('id', queryId)
    .single();

  if (queryError || !query) {
    throw new Error('Query not found');
  }

  await supabase
    .from('exa_queries')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', queryId);

  if ((process.env.EXA_DISCOVERY_MODE || 'websets').toLowerCase() === 'search') {
    return runSearchApiFallback(supabase, query);
  }

  const exa = getExaClient();

  const websetParams: any = {
    search: {
      query: query.query,
      count: 25,
    },
    enrichments: [
      {
        description: 'Find the email address for this person or creator',
        format: 'email',
      },
      {
        description: 'Extract the follower or subscriber count if visible',
        format: 'number',
      },
    ],
  };

  if (query.criteria && query.criteria.length > 0) {
    websetParams.search.criteria = query.criteria.slice(0, 5).map((c: string) => ({ description: c }));
  }

  let webset;
  try {
    webset = await exa.websets.create(websetParams);
  } catch (error) {
    await supabase
      .from('exa_queries')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', queryId);
    throw error;
  }

  const { data: websetRun, error: runError } = await supabase
    .from('webset_runs')
    .insert({
      query_id: queryId,
      webset_id: webset.id,
      status: 'running',
      items_found: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError) {
    console.error('Error creating webset run:', runError);
  }

  await inngest.send({
    name: 'autogtm/webset.created',
    data: {
      queryId,
      websetId: webset.id,
      websetRunId: websetRun?.id,
    },
  });

  return {
    websetId: webset.id,
    status: 'running',
    message: 'Search started. Lead extraction will happen in background.',
  };
}
