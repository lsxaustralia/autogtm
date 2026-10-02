import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startQueryRun } from '@/app/api/queries/_lib/startQueryRun';
import { inngest } from '@/inngest/client';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const action = request.nextUrl.searchParams.get('action');

  if (!process.env.INTERNAL_TEST_TOKEN || token !== process.env.INTERNAL_TEST_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    if (action === 'search') {
      const queryId = request.nextUrl.searchParams.get('queryId');
      if (!queryId) return NextResponse.json({ error: 'queryId required' }, { status: 400 });
      const result = await startQueryRun(supabase, queryId);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'enrich') {
      const leadId = request.nextUrl.searchParams.get('leadId');
      if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

      const { data: lead, error } = await supabase
        .from('leads')
        .select('id, url, email, name, exa_queries!inner(company_id)')
        .eq('id', leadId)
        .single();

      if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

      await supabase.from('leads').update({
        enrichment_status: 'pending',
        campaign_status: 'pending',
        suggested_campaign_id: null,
        suggested_campaign_reason: null,
        skip_reason: null,
      }).eq('id', leadId);

      const event = await inngest.send({
        name: 'autogtm/lead.created',
        data: {
          leadId: lead.id,
          leadUrl: lead.url,
          leadEmail: lead.email,
          leadName: lead.name,
          companyId: (lead.exa_queries as any).company_id,
          manualTest: true,
        },
      });

      return NextResponse.json({ success: true, event });
    }

    if (action === 'sync-inngest') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL missing' }, { status: 500 });

      const response = await fetch(`${appUrl}/api/inngest`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await response.text();
      return NextResponse.json({ success: response.ok, status: response.status, body });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
