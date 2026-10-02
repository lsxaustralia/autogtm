import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startQueryRun } from '@/app/api/queries/_lib/startQueryRun';
import { inngest } from '@/inngest/client';

const TEST_QUERY_ID = '1c2a96f2-e8b6-4974-abab-80aad9b2605f';

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'search';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    if (action === 'search') {
      const result = await startQueryRun(supabase, TEST_QUERY_ID);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'sync') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
      const response = await fetch(`${appUrl}/api/inngest`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      return NextResponse.json({ success: response.ok, status: response.status, body: await response.text() });
    }

    if (action === 'enrich-one') {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, url, email, name, exa_queries!inner(company_id)')
        .eq('query_id', TEST_QUERY_ID)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!lead) return NextResponse.json({ error: 'No test lead found' }, { status: 404 });

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
      return NextResponse.json({ success: true, leadId: lead.id, event });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
