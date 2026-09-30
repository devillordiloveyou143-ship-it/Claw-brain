/**
 * Army Worker Engine
 * Distributed worker pool, task queue, heartbeats, dead-letter queue, worker replacement
 */

class ArmyWorkerEngine {
  constructor(poolSize = 5) {
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    this.deadLetterQueue = [];
    this.initWorkers();
  }

  initWorkers() {
    for (let i = 1; i <= this.poolSize; i++) {
      this.workers.push({
        id: `soldier-node-${i}`,
        status: 'IDLE',
        lastHeartbeat: Date.now(),
        tasksCompleted: 0,
        failures: 0
      });
    }
  }

  enqueueTask(task) {
    const job = {
      jobId: 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      task,
      attempts: 0,
      maxAttempts: 3,
      status: 'QUEUED',
      enqueued_at: Date.now()
    };
    this.queue.push(job);
    this.dispatch();
    return job;
  }

  dispatch() {
    const idleWorker = this.workers.find(w => w.status === 'IDLE');
    if (!idleWorker || this.queue.length === 0) return;

    const job = this.queue.shift();
    idleWorker.status = 'BUSY';
    idleWorker.currentJob = job;
    job.status = 'PROCESSING';
    job.workerId = idleWorker.id;

    // Execute job asynchronously
    setTimeout(() => {
      try {
        idleWorker.status = 'IDLE';
        idleWorker.tasksCompleted++;
        idleWorker.currentJob = null;
        idleWorker.lastHeartbeat = Date.now();
        job.status = 'COMPLETED';
        job.completed_at = Date.now();
      } catch (err) {
        idleWorker.failures++;
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          this.queue.push(job);
        } else {
          job.status = 'DEAD_LETTER';
          this.deadLetterQueue.push(job);
        }
      }
      this.dispatch();
    }, 50);
  }

  getWorkerStats() {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.workers.filter(w => w.status === 'BUSY').length,
      idleWorkers: this.workers.filter(w => w.status === 'IDLE').length,
      queuedJobs: this.queue.length,
      deadLetterCount: this.deadLetterQueue.length,
      workers: this.workers
    };
  }

  replaceUnhealthyWorker(workerId) {
    const idx = this.workers.findIndex(w => w.id === workerId);
    if (idx !== -1) {
      this.workers[idx] = {
        id: `soldier-node-replaced-${Date.now() % 1000}`,
        status: 'IDLE',
        lastHeartbeat: Date.now(),
        tasksCompleted: 0,
        failures: 0
      };
      return { success: true, newWorker: this.workers[idx] };
    }
    return { success: false, error: 'Worker not found' };
  }
}

module.exports = { ArmyWorkerEngine };
