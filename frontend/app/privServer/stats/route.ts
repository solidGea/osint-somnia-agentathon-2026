import { NextResponse } from 'next/server';

const PROXY_SITE_URL = process.env.NEXT_PROXY_SITE_URL;
const PROXY_STATS_URL = PROXY_SITE_URL
  ? `${PROXY_SITE_URL.replace(/\/*$/, '')}/stats`
  : undefined;

export async function GET() {
  if (!PROXY_STATS_URL) {
    return NextResponse.json(
      { error: 'NEXT_PROXY_SITE_URL is not configured.' },
      { status: 500 }
    );
  }

  const response = await fetch(PROXY_STATS_URL, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { success: false, error: `Acelogic stats error: ${response.status} ${response.statusText}`, details: text },
      { status: response.status }
    );
  }

  const json = await response.json().catch((error) => ({ error: `Failed to parse Acelogic response: ${String(error)}` }));

  const quota = json?.data?.usage?.quota ?? json?.stats?.data?.usage?.quota;

  if (!quota) {
    return NextResponse.json(
      { error: 'Quota data is unavailable in Acelogic response.' },
      { status: 500 }
    );
  }

  const usedLimit = `${quota.used}/${quota.limit}`;
  const quotaResponse = {
    ...quota,
    usedLimit,
  };

  return NextResponse.json({ quota: quotaResponse });
}
