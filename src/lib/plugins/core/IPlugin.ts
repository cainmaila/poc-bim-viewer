import type { PluginContext } from './PluginContext'
import type { EventBus, EventHandler, EventSubscription, StandardEvents } from './EventBus'

/**
 * Plugin 接口
 * 所有 Plugin 必須實現此接口
 */
export interface IPlugin {
	/**
	 * Plugin 唯一名稱
	 */
	readonly name: string

	/**
	 * Plugin 依賴（必須在此 Plugin 之前初始化）
	 */
	readonly dependencies?: string[]

	/**
	 * 初始化 Plugin
	 */
	init(context: PluginContext): Promise<void> | void

	/**
	 * 更新 Plugin（在動畫循環中調用，可選）
	 */
	update?(deltaTime: number): void

	/**
	 * 清理資源
	 */
	dispose(): void
}

/**
 * 基礎 Plugin 抽象類
 * 提供通用實現，減少重複代碼
 */
export abstract class BasePlugin implements IPlugin {
	abstract readonly name: string
	readonly dependencies?: string[]

	protected context!: PluginContext
	protected disposed = false

	async init(context: PluginContext): Promise<void> {
		this.context = context
		await this.onInit()
	}

	/**
	 * 子類實現具體初始化邏輯
	 */
	protected abstract onInit(): Promise<void> | void

	/**
	 * 可選的更新方法
	 */
	update?(deltaTime: number): void

	dispose(): void {
		if (this.disposed) return
		this.onDispose()
		this.disposed = true
	}

	/**
	 * 子類實現清理邏輯
	 */
	protected abstract onDispose(): void

	/**
	 * 發送事件的便捷方法
	 */
	protected emit<K extends keyof StandardEvents>(event: K, data: StandardEvents[K]): void {
		this.context.eventBus.emit(event, data)
	}

	/**
	 * 訂閱事件的便捷方法
	 */
	protected on<K extends keyof StandardEvents>(
		event: K,
		handler: EventHandler<StandardEvents[K]>
	): EventSubscription {
		return this.context.eventBus.on(event, handler)
	}

	/**
	 * 獲取其他 Plugin 的便捷方法
	 */
	protected getPlugin<T extends IPlugin>(name: string): T | undefined {
		return this.context.getPlugin<T>(name)
	}

	/**
	 * 獲取 EventBus 的便捷方法
	 */
	protected get eventBus(): EventBus {
		return this.context.eventBus
	}
}
