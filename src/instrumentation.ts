// Daily interview reminders on a long-running server (Railway). Vercel runs the same endpoint from the cron in
// vercel.json, so this timer stays off there. The endpoint sends each interview time at most one reminder,
// so a restart or a second instance can never double-send.

const CHECK_EVERY_MS = 10 * 60_000;
const RUN_AT_VN_HOUR = 8;

function vietnamNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.VERCEL) return;
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.CRON_SECRET) {
    console.warn('[reminders] CRON_SECRET is not set, interview reminders are disabled');
    return;
  }

  let lastRunDay = '';
  const timer = setInterval(async () => {
    const now = vietnamNow();
    if (now.hour !== RUN_AT_VN_HOUR || lastRunDay === now.day) return;
    lastRunDay = now.day;
    try {
      const res = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/cron/interview-reminders`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      console.log(`[reminders] ${now.day} -> HTTP ${res.status}`);
    } catch (error) {
      lastRunDay = ''; // try again on the next tick
      console.error('[reminders] run failed', error);
    }
  }, CHECK_EVERY_MS);
  timer.unref();
}
