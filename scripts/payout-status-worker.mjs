import { pathToFileURL } from 'node:url';
export function startPayoutStatusWorker({ transport = fetch, intervalMs = 60000 } = {}) {
  const token = process.env.SETTLBOX_PAYOUT_STATUS_TOKEN;
  if (!token || token.length < 32) return () => {};
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid payout status worker port');
  let running = false; let stopped = false; let controller;
  const tick = async () => {
    if (running || stopped) return;
    running = true; controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); timeout.unref();
    try {
      const response = await transport(`http://127.0.0.1:${port}/api/payout-provider/reconcile`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (!response.ok) console.error(`Payout status check could not complete (HTTP ${response.status})`);
    } catch { if (!stopped) console.error('Payout status checks interrupted; existing references will be checked later'); }
    finally { clearTimeout(timeout); running = false; }
  };
  const timer = setInterval(tick, intervalMs); timer.unref();
  return () => { stopped = true; clearInterval(timer); controller?.abort(); };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.SETTLBOX_PAYOUT_STATUS_TOKEN || process.env.SETTLBOX_PAYOUT_STATUS_TOKEN.length < 32) throw new Error('Configure SETTLBOX_PAYOUT_STATUS_TOKEN with at least 32 random characters');
  const stop = startPayoutStatusWorker(); const keepAlive = setInterval(() => {}, 60000);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stop(); clearInterval(keepAlive); });
}
