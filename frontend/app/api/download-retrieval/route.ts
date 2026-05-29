import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { retrievalLink, format, filename } = body as {
      retrievalLink?: string;
      format?: string;
      filename?: string;
    };

    if (!retrievalLink || typeof retrievalLink !== 'string') {
      return NextResponse.json({ error: 'Missing retrievalLink' }, { status: 400 });
    }

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    const response = await fetch(retrievalLink);
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch retrieval URL: ${response.status}`, details: errorText },
        { status: 502 }
      );
    }

    const raw = await response.text();
    let output = raw;
    let mimeType = 'text/plain';

    if (format === 'json') {
      try {
        const parsed = JSON.parse(raw);
        output = JSON.stringify(parsed, null, 2);
      } catch {
        output = JSON.stringify({ raw }, null, 2);
      }
      mimeType = 'application/json';
    }

    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new Response(output, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error fetching download' }, { status: 500 });
  }
}
