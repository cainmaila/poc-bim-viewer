import type { IPlugin } from './IPlugin'
import type { PluginContext } from './PluginContext'
import { EventBus } from './EventBus'
import type * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface PluginManagerConfig {
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	renderer: THREE.WebGLRenderer
	controls: OrbitControls
	canvas: HTMLCanvasElement
}

/**
 * PluginManager - Plugin 管理器
 * 負責 Plugin 的生命周期管理、依賴解析和通訊協調
 */
export class PluginManager {
	private plugins: Map<string, IPlugin> = new Map()
	private context: PluginContext
	private eventBus: EventBus
	private initialized = false
	private disposed = false

	constructor(config: PluginManagerConfig) {
		this.eventBus = new EventBus()

		// 創建共享 PluginContext
		this.context = {
			scene: config.scene,
			camera: config.camera,
			renderer: config.renderer,
			controls: config.controls,
			canvas: config.canvas,
			eventBus: this.eventBus,
			getPlugin: <T extends IPlugin>(name: string): T | undefined => {
				return this.plugins.get(name) as T | undefined
			}
		}
	}

	/**
	 * 註冊 Plugin（必須在 init() 之前）
	 */
	register(name: string, plugin: IPlugin): void {
		if (this.initialized) {
			throw new Error('[PluginManager] Cannot register plugins after initialization')
		}

		if (this.plugins.has(name)) {
			console.warn(`[PluginManager] Plugin "${name}" already registered, replacing...`)
		}

		this.plugins.set(name, plugin)
		console.log(`[PluginManager] Registered plugin: ${name}`)
	}

	/**
	 * 初始化所有 Plugin（依照依賴順序）
	 */
	async init(): Promise<void> {
		if (this.initialized) {
			console.warn('[PluginManager] Already initialized')
			return
		}

		// 按依賴順序初始化
		const initOrder = this.resolveInitOrder()

		for (const name of initOrder) {
			const plugin = this.plugins.get(name)!
			try {
				await plugin.init(this.context)
				console.log(`[PluginManager] Initialized plugin: ${name}`)
			} catch (error) {
				console.error(`[PluginManager] Failed to initialize plugin "${name}":`, error)
				throw error
			}
		}

		this.initialized = true
		this.eventBus.emit('pluginManager:initialized', undefined)
	}

	/**
	 * 獲取 Plugin 實例
	 */
	getPlugin<T extends IPlugin>(name: string): T | undefined {
		return this.plugins.get(name) as T | undefined
	}

	/**
	 * 更新所有 Plugin（在動畫循環中調用）
	 */
	update(deltaTime: number): void {
		if (!this.initialized) return

		for (const [name, plugin] of this.plugins) {
			if (plugin.update) {
				try {
					plugin.update(deltaTime)
				} catch (error) {
					console.error(`[PluginManager] Error updating plugin "${name}":`, error)
				}
			}
		}
	}

	/**
	 * 銷毀所有 Plugin（按初始化逆序）
	 */
	dispose(): void {
		if (this.disposed) return

		const disposeOrder = this.resolveInitOrder().reverse()

		for (const name of disposeOrder) {
			const plugin = this.plugins.get(name)!
			try {
				plugin.dispose()
				console.log(`[PluginManager] Disposed plugin: ${name}`)
			} catch (error) {
				console.error(`[PluginManager] Error disposing plugin "${name}":`, error)
			}
		}

		this.eventBus.dispose()
		this.plugins.clear()
		this.disposed = true
	}

	/**
	 * 解析 Plugin 初始化順序（簡單拓撲排序）
	 */
	private resolveInitOrder(): string[] {
		const order: string[] = []
		const visited = new Set<string>()
		const visiting = new Set<string>()

		const visit = (name: string) => {
			if (visited.has(name)) return
			if (visiting.has(name)) {
				throw new Error(`[PluginManager] Circular dependency detected: ${name}`)
			}

			visiting.add(name)
			const plugin = this.plugins.get(name)!

			// 先初始化依賴
			if (plugin.dependencies) {
				for (const dep of plugin.dependencies) {
					if (!this.plugins.has(dep)) {
						throw new Error(`[PluginManager] Plugin "${name}" depends on missing plugin "${dep}"`)
					}
					visit(dep)
				}
			}

			visiting.delete(name)
			visited.add(name)
			order.push(name)
		}

		for (const name of this.plugins.keys()) {
			visit(name)
		}

		return order
	}

	/**
	 * 獲取 EventBus（供外部使用）
	 */
	getEventBus(): EventBus {
		return this.eventBus
	}
}
