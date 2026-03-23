import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { EthRate } from '@/models/EthRate';

export async function GET() {
  try {
    await dbConnect();

    // Calculate yesterday's date in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);
    const yesterday = new Date(nowIST);
    yesterday.setDate(yesterday.getDate() - 1);

    const dd = String(yesterday.getDate()).padStart(2, '0');
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yyyy = yesterday.getFullYear();
    const isoDate = `${yyyy}-${mm}-${dd}`;

    // Try to find the rate in the DB
    const existing = await EthRate.findOne({ date: isoDate });
    if (existing) {
      return NextResponse.json({
        success: true,
        date: isoDate,
        ethInr: existing.ethInr,
        ethUsd: existing.ethUsd,
      });
    }

    // Attempt to hit the refresh endpoint inline if missing
    // We construct an absolute URL assuming we are running on standard ports
    // But since fetch from within Next.js api routes to itself can be tricky without absolute URLs,
    // we can just call the logic from the refresh route directly or fallback.
    // We'll return the most recently saved rate instead.
    const latestRate = await EthRate.findOne().sort({ date: -1 });

    if (latestRate) {
      return NextResponse.json({
        success: true,
        date: latestRate.date,
        ethInr: latestRate.ethInr,
        ethUsd: latestRate.ethUsd,
        note: 'Fallback to latest available rate'
      });
    }

    // Absolute fallback
    return NextResponse.json({
      success: true,
      ethInr: 250000,
      ethUsd: 3000,
      note: 'Hardcoded fallback'
    });

  } catch (error: any) {
    console.error('Error fetching ETH rate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
