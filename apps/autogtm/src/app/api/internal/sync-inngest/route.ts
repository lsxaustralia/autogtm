import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!process.env.INTERNAL_TEST_TOKEN || token !== process.env.INTERNAL_TEST_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL missing' }, { status: 500 });
  }

  try {
    const response = await fetch(`${appUrl}/api/inngest`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const text = await response.text();
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      body: text.slice(0, 10000),
    }, { status: response.ok ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
