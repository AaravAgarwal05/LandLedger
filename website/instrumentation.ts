/**
 * Next.js Instrumentation Hook (runs once when the server starts)
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Schedules a daily midnight IST cron job to fetch and cache the previous
 * day's ETH/INR closing price from CoinGecko.
 */

export async function register() {
  // Only run cron on the actual Node.js server — skip in edge runtime and test
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  scheduleEthRateMidnightRefresh();
}

function scheduleEthRateMidnightRefresh() {
  const triggerRefresh = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const secret = process.env.CRON_SECRET;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (secret) headers['x-cron-secret'] = secret;

      const res = await fetch(`${baseUrl}/api/eth-rate/refresh`, { headers });
      const data = await res.json();
      if (data.ethInr) {
        console.log(`✅ [Cron] ETH/INR rate refreshed: ₹${data.ethInr} for ${data.date}`);
      } else {
        console.log(`ℹ️  [Cron] ETH/INR refresh result:`, data.message || 'no rate in response');
      }
    } catch (err) {
      console.error('❌ [Cron] Failed to refresh ETH/INR rate:', err);
    }
  };

  /**
   * Calculate milliseconds until the next IST midnight (00:00 IST = 18:30 UTC previous day).
   */
  const msUntilMidnightIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);

    const nextMidnightIST = new Date(nowIST);
    nextMidnightIST.setHours(24, 0, 0, 0); // midnight of the current IST day

    return nextMidnightIST.getTime() - nowIST.getTime();
  };

  // Schedule the first run at the next IST midnight, then every 24 hours
  const scheduleNext = () => {
    const delay = msUntilMidnightIST();
    const hoursUntil = (delay / 1000 / 60 / 60).toFixed(2);
    console.log(`🕐 [Cron] ETH/INR rate refresh scheduled in ${hoursUntil}h`);

    setTimeout(() => {
      triggerRefresh();
      // After first execution, repeat every 24 hours
      setInterval(triggerRefresh, 24 * 60 * 60 * 1000);
    }, delay);
  };

  scheduleNext();
}
