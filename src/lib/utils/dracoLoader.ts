import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { asset } from '$app/paths'

/**
 * 全局 Draco 載入器實例（Singleton）
 * 複用同一個實例以避免重複建立 Web Worker
 */
let globalDracoLoader: DRACOLoader | null = null

/**
 * 獲取或建立全局 Draco 解碼器實例
 * 採用 Singleton 模式，避免重複建立 Worker 導致效能問題
 * @returns 全局 Draco 解碼器實例
 */
function getOrCreateDracoLoader(): DRACOLoader {
	if (!globalDracoLoader) {
		globalDracoLoader = new DRACOLoader()
		// 使用 asset() 解析靜態資產路徑，會正確添加 base path
		const decoderPath = asset('/draco/gltf/')
		globalDracoLoader.setDecoderPath(decoderPath)
		globalDracoLoader.setDecoderConfig({ type: 'wasm' }) // 使用 WASM 獲得更好效能
	}
	return globalDracoLoader
}

/**
 * 配置 GLTFLoader 以支援 Draco 壓縮格式
 *
 * Draco 是一種幾何壓縮格式，可以大幅減小 3D 模型檔案大小
 * 此函式會設置必要的解碼器路徑和配置，並重用全局 Draco 實例
 *
 * @param gltfLoader - 要配置的 GLTFLoader 實例
 */
export function configureDracoLoader(gltfLoader: GLTFLoader): void {
	const dracoLoader = getOrCreateDracoLoader()
	gltfLoader.setDRACOLoader(dracoLoader)
}

/**
 * 清除全局 Draco 載入器（適用於應用卸載時）
 * 釋放 Web Worker 資源
 */
export function disposeDracoLoader(): void {
	if (globalDracoLoader) {
		globalDracoLoader.dispose()
		globalDracoLoader = null
	}
}
