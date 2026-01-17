import * as THREE from 'three'
import { loadGLBModel, loadGLBFromFile } from '../utils/gltfLoader'
import {
	setActiveModelKey,
	saveModelToCache,
	getModelFromCache,
	clearCache,
	getActiveModelKey
} from '../utils/database'
import { bimSettingsStore } from './bimSettings.svelte'

/**
 * 側邊欄導覽用的樹狀項目結構
 */
export interface TreeItem {
	id: string
	name: string
	type: string
	children: TreeItem[]
}

/**
 * 模型快取狀態（使用 Svelte 5 Runes）
 */
class ModelCacheStore {
	// Reactive state variables using $state
	private _isLoading = $state(false)
	private _loadProgress = $state(0)
	private _model = $state<THREE.Group | null>(null)
	private _error = $state<string | null>(null)
	private _fromCache = $state(false)
	private _treeData = $state<TreeItem[]>([])

	// Getters for reactive state access
	get isLoading() {
		return this._isLoading
	}

	get loadProgress() {
		return this._loadProgress
	}

	get model() {
		return this._model
	}

	get error() {
		return this._error
	}

	set error(msg: string | null) {
		this._error = msg
	}

	get fromCache() {
		return this._fromCache
	}

	get treeData() {
		return this._treeData
	}

	/**
	 * 從 URL 載入 GLB 模型（含快取機制）
	 * @param url - GLB 檔案的 URL
	 */
	async loadModel(url: string): Promise<void> {
		this._isLoading = true
		this._loadProgress = 0
		this._error = null
		this._fromCache = false

		const cacheKey = url.split('/').pop() || url

		try {
			const result = await loadGLBModel(url, (progress) => {
				this._loadProgress = Math.round(progress)
			})

			this._model = result.scene
			this._fromCache = result.fromCache

			// Save as active model key
			await setActiveModelKey(cacheKey)

			// Generate tree data
			this._treeData = this.generateTreeData(this._model!)

			// Initialize BIM settings
			if (this._model) {
				await bimSettingsStore.initForModel(cacheKey, this._model)
			}

			console.log(
				`[ModelCache] Model loaded successfully (from ${result.fromCache ? 'cache' : 'network'})`
			)
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : '載入模型失敗'
			this._error = errorMessage
			console.error('[ModelCache] Failed to load model:', e)
		} finally {
			this._isLoading = false
		}
	}

	/**
	 * 從本機檔案載入 GLB 模型
	 * @param file - 檔案物件
	 */
	async loadModelFromFile(file: File): Promise<void> {
		this._isLoading = true
		this._loadProgress = 0
		this._error = null
		this._fromCache = false

		try {
			const result = await loadGLBFromFile(file, (progress) => {
				this._loadProgress = Math.round(progress)
			})

			this._model = result.scene
			this._fromCache = false

			// Save to cache and set as active
			const arrayBuffer = await file.arrayBuffer()
			await saveModelToCache(file.name, arrayBuffer)
			await setActiveModelKey(file.name)

			// Generate tree data
			this._treeData = this.generateTreeData(this._model!)

			// Initialize BIM settings
			if (this._model) {
				await bimSettingsStore.initForModel(file.name, this._model)
			}
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : '解析模型失敗'
			this._error = errorMessage
			console.error('[ModelCache] Failed to load model from file:', e)
		} finally {
			this._isLoading = false
		}
	}

	/**
	 * 從 IndexedDB 快取以 key 載入 GLB 模型
	 * @param cacheKey - 快取鍵
	 */
	async loadModelFromCache(cacheKey: string): Promise<void> {
		this._isLoading = true
		this._loadProgress = 0
		this._error = null
		this._fromCache = true

		try {
			const cachedData = await getModelFromCache(cacheKey)
			if (!cachedData) {
				throw new Error('模型不在緩存中')
			}

			this._loadProgress = 50

			// Parse from ArrayBuffer
			const result = await loadGLBFromFile(
				new File([cachedData], cacheKey, { type: 'model/gltf-binary' }),
				(progress) => {
					this._loadProgress = 50 + Math.round(progress * 0.5)
				}
			)

			this._model = result.scene
			this._fromCache = true

			// Generate tree data
			this._treeData = this.generateTreeData(this._model!)

			// Initialize BIM settings
			if (this._model) {
				await bimSettingsStore.initForModel(cacheKey, this._model)
			}
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : '從緩存載入模型失敗'
			this._error = errorMessage
			console.error('[ModelCache] Failed to load model from cache:', e)
		} finally {
			this._isLoading = false
		}
	}

	/**
	 * 清除目前載入的模型並重置狀態
	 */
	clearModel(): void {
		// Dispose of Three.js resources
		if (this._model) {
			this._model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry?.dispose()

					// Dispose xray material if cached
					if (child.userData.xrayMaterial) {
						child.userData.xrayMaterial.dispose()
						delete child.userData.xrayMaterial
					}

					if (Array.isArray(child.material)) {
						child.material.forEach((material) => material.dispose())
					} else {
						child.material?.dispose()
					}
				}
			})
		}

		this._model = null
		this._loadProgress = 0
		this._error = null
		this._fromCache = false
		this._treeData = []

		// Clear BIM settings
		bimSettingsStore.clear()

		console.log('[ModelCache] Model cleared')
	}

	/**
	 * 從 Three.js 模型生成階層化樹狀資料
	 * @param object - 根物件
	 * @returns 樹狀項目陣列
	 */
	private generateTreeData(object: THREE.Object3D): TreeItem[] {
		const items: TreeItem[] = []

		object.children.forEach((child) => {
			const item: TreeItem = {
				id: child.uuid,
				name: child.name || child.type,
				type: child.type,
				children: this.generateTreeData(child)
			}
			items.push(item)
		})

		return items
	}

	/**
	 * 重置錯誤狀態
	 */
	clearError(): void {
		this._error = null
	}

	/**
	 * 卸載目前模型，清除快取，並重新載入頁面
	 */
	async unloadModel(): Promise<void> {
		// Get active model key before clearing
		const activeKey = await getActiveModelKey()

		this.clearModel()
		await clearCache()

		// Delete corresponding BIM settings
		if (activeKey) {
			await bimSettingsStore.deleteSettings(activeKey)
		}

		console.log('[ModelCache] Model unloaded and cache cleared')
		// Reload the page after a short delay
		setTimeout(() => {
			window.location.reload()
		}, 300)
	}
}

// Export a singleton instance
export const modelStore = new ModelCacheStore()
