import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const frameUrl = searchParams.get('frameUrl');

  if (!frameUrl) {
    return NextResponse.json({ error: 'Missing frameUrl parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(frameUrl);
    const html = await response.text();

    // Extract relevant meta tags
    const metaTags: { [key: string]: string } = {};
    const metaTagRegex = /<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]+)"\/?>/g;
    let match;

    while ((match = metaTagRegex.exec(html)) !== null) {
      metaTags[match[1]] = match[2];
    }

    console.log('DEBUG_METADATA_EXTRACTED:', JSON.stringify(metaTags, null, 2));

    return NextResponse.json({
      status: 'success',
      frameUrl: frameUrl,
      extractedMetaTags: metaTags,
      htmlSnippet: html.substring(0, 1000) // Log 1KB of HTML to see if there's an issue
    });

  } catch (error: any) {
    console.error('DEBUG_METADATA_ERROR:', error.message);
    return NextResponse.json({
      error: 'Failed to fetch or parse frame URL',
      details: error.message
    }, { status: 500 });
  }
}