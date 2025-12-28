import type * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { EventBus } from './EventBus'
import type { IPlugin } from './IPlugin'

/**
 * Plugin Context - 共享資源和 API
 * 提供給所有 Plugin 的執行環境和資源訪問
 */
export interface PluginContext {
	// Three.js 核心對象
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	renderer: THREE.WebGLRenderer
	controls: OrbitControls
	canvas: HTMLCanvasElement

	// 事件總線
	eventBus: EventBus

	// 獲取其他 Plugin（用於 Plugin 間通訊）
	getPlugin<T extends IPlugin>(name: string): T | undefined
}
