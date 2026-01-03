/**
 * Notification Utility
 *
 * Provides convenient API for displaying notifications:
 * - Success messages → Toast (auto-dismiss)
 * - Error messages → Alert banner (manual dismiss)
 */

import { toast } from 'svelte-sonner'
import { notificationsStore } from '$lib/stores/notifications.svelte'

/**
 * Notification helper functions
 */
export const notify = {
	/**
	 * Show success toast (auto-dismisses after 3 seconds)
	 *
	 * @param message - Success message to display
	 */
	success: (message: string): void => {
		toast.success(message, { duration: 3000 })
	},

	/**
	 * Show error alert banner (requires manual dismiss)
	 *
	 * @param message - Error message to display
	 */
	error: (message: string): void => {
		notificationsStore.error(message)
	},

	/**
	 * Show info toast (auto-dismisses after 4 seconds)
	 *
	 * @param message - Info message to display
	 */
	info: (message: string): void => {
		toast.info(message, { duration: 4000 })
	},

	/**
	 * Show warning toast (auto-dismisses after 5 seconds)
	 *
	 * @param message - Warning message to display
	 */
	warning: (message: string): void => {
		toast.warning(message, { duration: 5000 })
	}
}
