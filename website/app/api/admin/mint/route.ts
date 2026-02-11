import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({ success: true, tokenId: 'T123', ipfsCid: 'bafy...' });
}
