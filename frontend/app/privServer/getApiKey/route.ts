import { NextResponse } from 'next/server';

const OSINT_SERVICE_URL = process.env.NEXT_PUBLIC_OSINT_API_BASE_URL_V3_KEY || process.env.OSINT_API_BASE_URL_V3_KEY;

function buildGetApiKeyUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (/\/api\/getApiKey\/?$/.test(trimmed)) {
    return trimmed;
  }
  if (/\/api\/?$/.test(trimmed)) {
    return `${trimmed.replace(/\/+$/, '')}/getApiKey`;
  }
  return `${trimmed}/api/getApiKey`;
}

export async function POST(req: Request) {
  if (!OSINT_SERVICE_URL) {
    return NextResponse.json(
      { success: false, error: 'OSINT service base URL is not configured.' },
      { status: 500 }
    );
  }

  const body = await req.json();
  const targetUrl = buildGetApiKeyUrl(OSINT_SERVICE_URL);

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.text();
  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid response from OSINT service', raw: payload },
      { status: 502 }
    );
  }

  return NextResponse.json(data, { status: response.status });
}
