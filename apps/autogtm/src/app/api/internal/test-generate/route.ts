import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const companyId = request.nextUrl.searchParams.get('companyId');

  if (!process.env.INTERNAL_TEST_TOKEN || token !== process.env.INTERNAL_TEST_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL missing' }, { status: 500 });

  const response = await fetch(`${appUrl}/api/queries/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ companyId }),
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
  });
}
