import { prepareScheduledPayments } from "./payment-schedule-worker.mjs";

process.stdout.write(`${prepareScheduledPayments()} scheduled payment drafts prepared for review\n`);
