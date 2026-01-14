/**
 * Yields control to the main thread to keep the UI responsive.
 * Uses setTimeout, which pushes the execution to the end of the event loop queue.
 */
export const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A helper class to manage yielding based on time budgets.
 * Useful for long-running loops.
 */
export class TimeSlicer {
	private lastYieldTime: number
	private timeBudget: number

	/**
	 * @param timeBudgetMs - How many milliseconds to work before yielding (default: 12ms to be safe)
	 */
	constructor(timeBudgetMs: number = 12) {
		this.lastYieldTime = performance.now()
		this.timeBudget = timeBudgetMs
	}

	/**
	 * Checks if the time budget is exceeded and yields if necessary.
	 * @returns Promise that resolves immediately if budget is fine, or after a delay if yielded.
	 */
	async check(): Promise<void> {
		if (performance.now() - this.lastYieldTime > this.timeBudget) {
			await yieldToMain()
			this.lastYieldTime = performance.now()
		}
	}
}
