import { pathToFileURL } from 'node:url';
export function startFinanceAgentWorker() {
  const token = process.env.SETTLBOX_FINANCE_WORKER_TOKEN;
  if (!token || token.length < 32) return () => {};
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid finance worker port');
  let running = false; let stopped = false; let controller;
  const tick = async () => {
    if (running || stopped) return;
    running = true; controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9 * 60000); timeout.unref();
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/agent-worker`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tick' }), signal: controller.signal });
      if (!response.ok) console.error(`Finance worker cycle could not complete (HTTP ${response.status})`);
    } catch { if (!stopped) console.error('Finance worker connection interrupted; the next cycle will retry saved requests'); }
    finally { clearTimeout(timeout); running = false; }
  };
  const timer = setInterval(tick, 60000); timer.unref();
  return () => { stopped = true; clearInterval(timer); controller?.abort(); };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.SETTLBOX_FINANCE_WORKER_TOKEN || process.env.SETTLBOX_FINANCE_WORKER_TOKEN.length < 32) throw new Error('Configure SETTLBOX_FINANCE_WORKER_TOKEN with at least 32 characters');
  const stop = startFinanceAgentWorker();
  const keepAlive = setInterval(() => {}, 60000);
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => { stop(); clearInterval(keepAlive); });
}
