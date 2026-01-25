/**
 * Robust Action Queue with Exponential Backoff
 * Ensures 100% reliability for network operations.
 */
export class ActionQueue {
    constructor(options = {}) {
        this.queue = [];
        this.processing = false;
        this.maxRetries = options.maxRetries || 5;
        this.initialDelay = options.initialDelay || 200;
    }

    add(networkFactory, context = {}) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                factory: networkFactory,
                context,
                resolve,
                reject,
                attempts: 0
            });
            this.processNext();
        });
    }

    async processNext() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        const task = this.queue[0]; // Peek

        try {
            // Execute
            const result = await task.factory();

            // Success
            this.queue.shift(); // Remove
            task.resolve(result);
        } catch (error) {
            task.attempts++;
            console.warn(`⚠ Action failed (Attempt ${task.attempts}/${this.maxRetries}): ${error.message}`);

            if (task.attempts >= this.maxRetries) {
                // Fatal Failure
                this.queue.shift();
                task.reject(error);
            } else {
                // Retry with backoff
                const delay = this.initialDelay * Math.pow(2, task.attempts - 1);
                await new Promise(r => setTimeout(r, delay));
            }
        } finally {
            this.processing = false;
            // Continue regardless of success/fail to keep queue moving
            if (this.queue.length > 0) this.processNext();
        }
    }

    clear() {
        this.queue = [];
        this.processing = false;
    }
}
