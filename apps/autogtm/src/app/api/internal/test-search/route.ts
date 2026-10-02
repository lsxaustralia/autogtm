import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startQueryRun } from '@/app/api/queries/_lib/startQueryRun';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const queryId = request.nextUrl.searchParams.get('queryId');

  if (!process.env.INTERNAL_TEST_TOKEN || token !== process.env.INTERNAL_TEST_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!queryId) {
    return NextResponse.json({ error: 'queryId is required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const result = await startQueryRun(supabase, queryId);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
