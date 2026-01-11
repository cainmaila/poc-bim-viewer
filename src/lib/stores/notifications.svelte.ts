/**
 * 通知 Store
 *
 * 管理需手動關閉的錯誤警示橫幅（使用 Svelte 5 Runes）。
 * 成功/資訊類訊息則由 svelte-sonner 的吐司顯示。
 */

interface Notification {
	id: string
	type: 'error'
	message: string
	dismissible: boolean
	createdAt: number
}

/**
 * Notifications Store（Svelte 5 Runes）
 *
 * 管理直到手動關閉為止的錯誤警示橫幅。
 * 成功吐司由 svelte-sonner 直接處理。
 */
export class NotificationsStore {
	// Reactive error alerts
	_alerts = $state<Notification[]>([])

	get alerts() {
		return this._alerts
	}

	/**
	 * 新增錯誤警示橫幅
	 *
	 * @param message - 要顯示的錯誤訊息
	 */
	error(message: string): void {
		const notification: Notification = {
			id: crypto.randomUUID(),
			type: 'error',
			message,
			dismissible: true,
			createdAt: Date.now()
		}

		// Add to top of array (newest first)
		this._alerts = [notification, ...this._alerts]

		console.log('[Notifications] Error alert added:', message)
	}

	/**
	 * 關閉特定的警示橫幅
	 *
	 * @param id - 要關閉的通知 ID
	 */
	dismiss(id: string): void {
		this._alerts = this._alerts.filter((alert) => alert.id !== id)
		console.log('[Notifications] Alert dismissed:', id)
	}

	/**
	 * 關閉所有警示橫幅
	 */
	dismissAll(): void {
		this._alerts = []
		console.log('[Notifications] All alerts dismissed')
	}
}

// Export singleton instance
export const notificationsStore = new NotificationsStore()
