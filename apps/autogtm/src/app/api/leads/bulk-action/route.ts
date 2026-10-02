import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  try {
    const { leadIds, action } = await request.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds is required' }, { status: 400 });
    }
    if (!['approve', 'skip'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or skip' }, { status: 400 });
    }

    const ids = [...new Set(leadIds.filter((id: unknown) => typeof id === 'string'))];
    if (!ids.length || ids.length > 100) {
      return NextResponse.json({ error: 'Select between 1 and 100 leads' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (action === 'skip') {
      const { error } = await supabase
        .from('leads')
        .update({
          campaign_status: 'skipped',
          skip_reason: 'Manually skipped in bulk',
          suggested_campaign_id: null,
          suggested_campaign_reason: null,
        })
        .in('id', ids)
        .neq('campaign_status', 'routed');

      if (error) throw error;
      return NextResponse.json({ success: true, action, count: ids.length });
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, email, full_name, suggested_campaign_id, campaign_status, enrichment_status')
      .in('id', ids);

    if (error) throw error;

    const eligible = (leads || []).filter((lead: any) =>
      lead.email &&
      lead.full_name &&
      lead.suggested_campaign_id &&
      lead.campaign_status !== 'routed' &&
      lead.campaign_status !== 'skipped' &&
      lead.enrichment_status === 'enriched'
    );

    if (!eligible.length) {
      return NextResponse.json({ error: 'No selected leads are ready to add' }, { status: 400 });
    }

    await inngest.send({
      name: 'autogtm/leads.bulk-add-to-campaign',
      data: {
        leadIds: eligible.map((lead: any) => lead.id),
      },
    });

    return NextResponse.json({
      success: true,
      action,
      requested: ids.length,
      queued: eligible.length,
    });
  } catch (error) {
    console.error('Bulk lead action failed:', error);
    return NextResponse.json({ error: 'Bulk lead action failed' }, { status: 500 });
  }
}
