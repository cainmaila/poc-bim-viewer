import type * as THREE from 'three'

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>

export interface EventSubscription {
	unsubscribe: () => void
}

/**
 * 標準事件類型定義
 */
export interface StandardEvents {
	// Camera Events
	'camera:moveStart': { position: THREE.Vector3; target: THREE.Vector3 }
	'camera:moveEnd': { position: THREE.Vector3; target: THREE.Vector3 }
	'camera:animating': { progress: number }
	'camera:viewChanged': { position: THREE.Vector3; target: THREE.Vector3 }
	'camera:resetView': { direction?: 'isometric' | 'top' | 'front' | 'side' }

	// Object Selection Events
	'object:selected': { object: THREE.Object3D; id: string }
	'object:deselected': { object: THREE.Object3D | null }
	'object:hovered': { object: THREE.Object3D; id: string }

	// Model Events
	'model:loaded': { model: THREE.Group }
	'model:cleared': void
	'model:error': { error: string }

	// Interaction Events
	'input:keyDown': { key: string; code: string }
	'input:keyUp': { key: string; code: string }
	'input:click': { object?: THREE.Object3D; point: THREE.Vector3 }

	// PluginManager Events
	'pluginManager:initialized': void
	'pluginManager:disposed': void

	// Settings Events
	'settings:gridToggle': { visible: boolean }
	'settings:boundingBoxToggle': { visible: boolean }
}

/**
 * EventBus - 事件總線
 * 提供松耦合的 Plugin 間通訊機制
 */
export class EventBus {
	private listeners: Map<string, Set<EventHandler>> = new Map()
	private onceListeners: Map<string, Set<EventHandler>> = new Map()
	private eventLog: Array<{ event: string; timestamp: number; data: unknown }> = []
	private readonly maxLogSize = 100

	/**
	 * 訂閱事件
	 */
	on<K extends keyof StandardEvents>(
		event: K,
		handler: EventHandler<StandardEvents[K]>
	): EventSubscription
	on(event: string, handler: EventHandler): EventSubscription {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set())
		}

		this.listeners.get(event)!.add(handler)

		return {
			unsubscribe: () => this.off(event, handler)
		}
	}

	/**
	 * 訂閱事件（僅一次）
	 */
	once<K extends keyof StandardEvents>(
		event: K,
		handler: EventHandler<StandardEvents[K]>
	): EventSubscription
	once(event: string, handler: EventHandler): EventSubscription {
		if (!this.onceListeners.has(event)) {
			this.onceListeners.set(event, new Set())
		}

		this.onceListeners.get(event)!.add(handler)

		return {
			unsubscribe: () => {
				this.onceListeners.get(event)?.delete(handler)
			}
		}
	}

	/**
	 * 取消訂閱
	 */
	off(event: string, handler: EventHandler): void {
		this.listeners.get(event)?.delete(handler)
		this.onceListeners.get(event)?.delete(handler)
	}

	/**
	 * 發送事件
	 */
	emit<K extends keyof StandardEvents>(event: K, data: StandardEvents[K]): void
	emit(event: string, data?: unknown): void {
		// 記錄事件（用於調試）
		this.logEvent(event, data)

		// 執行一次性監聽器
		const onceHandlers = this.onceListeners.get(event)
		if (onceHandlers) {
			onceHandlers.forEach((handler) => {
				try {
					handler(data)
				} catch (error) {
					console.error(`[EventBus] Error in once handler for "${event}":`, error)
				}
			})
			this.onceListeners.delete(event)
		}

		// 執行常規監聽器
		const handlers = this.listeners.get(event)
		if (handlers) {
			handlers.forEach((handler) => {
				try {
					handler(data)
				} catch (error) {
					console.error(`[EventBus] Error in handler for "${event}":`, error)
				}
			})
		}
	}

	/**
	 * 清除所有監聽器
	 */
	clear(event?: string): void {
		if (event) {
			this.listeners.delete(event)
			this.onceListeners.delete(event)
		} else {
			this.listeners.clear()
			this.onceListeners.clear()
		}
	}

	/**
	 * 獲取事件日誌（用於調試）
	 */
	getEventLog(count?: number): Array<{ event: string; timestamp: number; data: unknown }> {
		return count ? this.eventLog.slice(-count) : this.eventLog
	}

	/**
	 * 記錄事件
	 */
	private logEvent(event: string, data: unknown): void {
		this.eventLog.push({
			event,
			timestamp: Date.now(),
			data
		})

		// 限制日誌大小
		if (this.eventLog.length > this.maxLogSize) {
			this.eventLog.shift()
		}
	}

	/**
	 * 清理資源
	 */
	dispose(): void {
		this.clear()
		this.eventLog = []
	}
}
