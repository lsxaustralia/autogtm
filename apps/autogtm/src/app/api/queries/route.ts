import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('exa_queries')
      .select('*, company_updates(content), webset_runs(webset_id, status)')
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: queries, error } = await query;

    if (error) throw error;

    const normalizedQueries = (queries || []).map((q: any) => ({
      ...q,
      webset_runs: (q.webset_runs || []).filter(
        (run: any) => !String(run.webset_id || '').startsWith('search-api-')
      ),
    }));

    return NextResponse.json({ queries: normalizedQueries });
  } catch (error) {
    console.error('Error fetching queries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queries' },
      { status: 500 }
    );
  }
}
