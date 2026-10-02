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

async function runSearchApiFallback(supabase: any, query: any) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error('EXA_API_KEY is required');

  const criteria = Array.isArray(query.criteria) ? query.criteria : [];
  const searchText = [query.query, ...criteria.map((c: string) => `Criterion: ${c}`)].join('. ');

  const requestBody: Record<string, any> = {
    query: searchText,
    type: 'auto',
    numResults: 10,
    contents: { highlights: true },
  };

  const lower = String(query.query || '').toLowerCase();
  if (lower.includes('linkedin')) {
    requestBody.category = 'people';
    requestBody.includeDomains = ['linkedin.com'];
  } else if (lower.includes('youtube')) {
    requestBody.includeDomains = ['youtube.com'];
  } else if (lower.includes('instagram')) {
    requestBody.includeDomains = ['instagram.com'];
  } else if (lower.includes('tiktok')) {
    requestBody.includeDomains = ['tiktok.com'];
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
    throw new Error(`Exa Search API failed (${response.status}): ${payload?.error || payload?.message || JSON.stringify(payload)}`);
  }

  const rawResults = Array.isArray(payload?.results) ? payload.results : [];
  const seen = new Set<string>();
  const results = rawResults.filter((r: any) => {
    const url = String(r?.url || '');
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  const runId = `search-api-${Date.now()}`;
  const now = new Date().toISOString();

  const { data: websetRun, error: websetRunError } = await supabase
    .from('webset_runs')
    .insert({
      query_id: query.id,
      webset_id: runId,
      status: 'completed',
      items_found: results.length,
      started_at: now,
      completed_at: now,
    })
    .select('id')
    .single();

  if (websetRunError) throw websetRunError;

  const urls = results.map((r: any) => String(r.url));
  let existingUrls = new Set<string>();
  if (urls.length > 0) {
    const { data: existing } = await supabase.from('leads').select('url').in('url', urls);
    existingUrls = new Set((existing || []).map((r: any) => String(r.url)));
  }

  const rows = results
    .filter((r: any) => !existingUrls.has(String(r.url)))
    .map((r: any) => ({
      query_id: query.id,
      webset_run_id: websetRun.id,
      name: r.title || r.author || 'Unknown',
      email: null,
      url: String(r.url),
      platform: platformFromUrl(String(r.url)),
      follower_count: null,
      enrichment_data: r,
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
    message: `Search completed with ${results.length} Exa results and ${insertedLeads.length} new leads.`,
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
