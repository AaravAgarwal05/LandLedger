import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { EthRate } from '@/models/EthRate';

/**
 * GET /api/eth-rate/refresh
 * Fetches yesterday's ETH/INR closing price from CoinGecko and stores it in MongoDB.
 * This endpoint is designed to be called automatically at midnight IST by a cron job
 * or can be triggered manually to pre-warm the cache.
 *
 * Protected by CRON_SECRET header to prevent abuse.
 */
export async function GET(req: Request) {
  try {
    // Optional: protect with a secret header (set CRON_SECRET in .env.local)
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const authHeader = req.headers.get('x-cron-secret');
      if (authHeader !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await dbConnect();

    // Calculate yesterday's date in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5h30m
    const nowIST = new Date(now.getTime() + istOffset);
    const yesterday = new Date(nowIST);
    yesterday.setDate(yesterday.getDate() - 1);

    // CoinGecko requires date in DD-MM-YYYY format
    const dd = String(yesterday.getDate()).padStart(2, '0');
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yyyy = yesterday.getFullYear();
    const cgDate = `${dd}-${mm}-${yyyy}`;          // "22-03-2026"
    const isoDate = `${yyyy}-${mm}-${dd}`;          // "2026-03-22" (DB key)

    // Check if we already have this date stored
    const existing = await EthRate.findOne({ date: isoDate });
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Rate already cached for this date',
        date: isoDate,
        ethInr: existing.ethInr,
      });
    }

    // Fetch from CoinGecko historical endpoint
    const cgUrl = `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${cgDate}&localization=false`;
    const res = await fetch(cgUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 0 }, // never cache this server-side
    });

    if (!res.ok) {
      throw new Error(`CoinGecko returned ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const ethInr = data?.market_data?.current_price?.inr;
    const ethUsd = data?.market_data?.current_price?.usd;

    if (!ethInr) {
      throw new Error('INR price not available in CoinGecko response');
    }

    // Store rate in MongoDB
    await EthRate.create({
      date: isoDate,
      ethInr: Math.round(ethInr), // round to nearest rupee
      ethUsd: Math.round(ethUsd || 0),
      source: 'coingecko',
    });

    console.log(`✅ ETH/INR rate stored for ${isoDate}: ₹${Math.round(ethInr)}`);

    return NextResponse.json({
      success: true,
      date: isoDate,
      ethInr: Math.round(ethInr),
      ethUsd: Math.round(ethUsd || 0),
    });
  } catch (error: any) {
    console.error('Error refreshing ETH rate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
