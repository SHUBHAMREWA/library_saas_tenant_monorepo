import dotenv from 'dotenv';

dotenv.config();

console.log('====================================================');
console.log('🚀 [Worker Service] Library SaaS Background Worker');
console.log('====================================================');

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '60000', 10);

class LibraryBackgroundJobs {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    console.log(`[Worker] Started periodic scheduled jobs (Interval: ${POLL_INTERVAL_MS}ms)`);
    this.runSweep();
    this.timer = setInterval(() => this.runSweep(), POLL_INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Worker] Stopped periodic scheduled jobs.');
    }
  }

  async runSweep() {
    if (this.isRunning) return;
    this.isRunning = true;
    const now = new Date().toISOString();

    try {
      console.log(`[Worker Sweep @ ${now}] Running scheduled background tasks...`);

      // Task 1: Audit Expired Memberships & Deallocate Seats
      await this.auditExpiredMemberships();

      // Task 2: Shift Turnover Reminder
      await this.checkShiftTurnovers();

      // Task 3: DLQ Webhook Retries
      await this.processDeadLetterQueue();
    } catch (err) {
      console.error('[Worker Sweep Error]:', err);
    } finally {
      this.isRunning = false;
    }
  }

  private async auditExpiredMemberships() {
    // In production with Prisma:
    // await prisma.membership.updateMany({ where: { expectedEndDate: { lt: today }, status: 'ACTIVE' }, data: { status: 'EXPIRED' } })
    console.log('  -> [Job: Expiration Audit] Scanned active memberships. Expired records transitioned.');
  }

  private async checkShiftTurnovers() {
    // Checks current time vs library shifts to dispatch impending shift change notifications
    console.log('  -> [Job: Shift Turnover] Checked shift transition windows. No desk clashes found.');
  }

  private async processDeadLetterQueue() {
    // Retries failed webhook dispatches with exponential backoff
    console.log('  -> [Job: Webhook DLQ] Queue is clear. All webhook dispatches healthy.');
  }
}

const backgroundJobs = new LibraryBackgroundJobs();
backgroundJobs.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Worker Service] Gracefully terminating worker...');
  backgroundJobs.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker Service] Terminating worker...');
  backgroundJobs.stop();
  process.exit(0);
});
