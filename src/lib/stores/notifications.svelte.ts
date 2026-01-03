/**
 * Notifications Store
 *
 * Manages error alert banners using Svelte 5 Runes.
 * Success/info messages are handled by svelte-sonner Toast.
 */

interface Notification {
	id: string
	type: 'error'
	message: string
	dismissible: boolean
	createdAt: number
}

/**
 * Notifications Store (Svelte 5 Runes)
 *
 * Manages error alert banners that persist until manually dismissed.
 * Success toasts are handled directly by svelte-sonner.
 */
export class NotificationsStore {
	// Reactive error alerts
	_alerts = $state<Notification[]>([])

	get alerts() {
		return this._alerts
	}

	/**
	 * Add an error alert banner
	 *
	 * @param message - Error message to display
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
	 * Dismiss a specific alert banner
	 *
	 * @param id - Notification ID to dismiss
	 */
	dismiss(id: string): void {
		this._alerts = this._alerts.filter((alert) => alert.id !== id)
		console.log('[Notifications] Alert dismissed:', id)
	}

	/**
	 * Dismiss all alert banners
	 */
	dismissAll(): void {
		this._alerts = []
		console.log('[Notifications] All alerts dismissed')
	}
}

// Export singleton instance
export const notificationsStore = new NotificationsStore()
