import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const leadId = request.nextUrl.searchParams.get('leadId');

  if (!process.env.INTERNAL_TEST_TOKEN || token !== process.env.INTERNAL_TEST_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  const result = await inngest.send({
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

  return NextResponse.json({ success: true, event: result });
}
