/**
 * 通知工具
 *
 * 提供顯示通知的便利 API：
 * - 成功訊息 → 吐司（自動關閉）
 * - 錯誤訊息 → 警示橫幅（手動關閉）
 */

import { toast } from 'svelte-sonner'
import { notificationsStore } from '$lib/stores/notifications.svelte'

/**
 * 通知輔助函式
 */
export const notify = {
	/**
	 * 顯示成功吐司（3 秒後自動關閉）
	 *
	 * @param message - 要顯示的成功訊息
	 */
	success: (message: string): void => {
		toast.success(message, { duration: 3000 })
	},

	/**
	 * 顯示錯誤警示橫幅（需手動關閉）
	 *
	 * @param message - 要顯示的錯誤訊息
	 */
	error: (message: string): void => {
		notificationsStore.error(message)
	},

	/**
	 * 顯示資訊吐司（4 秒後自動關閉）
	 *
	 * @param message - 要顯示的資訊訊息
	 */
	info: (message: string): void => {
		toast.info(message, { duration: 4000 })
	},

	/**
	 * 顯示警告吐司（5 秒後自動關閉）
	 *
	 * @param message - 要顯示的警告訊息
	 */
	warning: (message: string): void => {
		toast.warning(message, { duration: 5000 })
	}
}
