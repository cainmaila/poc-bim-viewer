import * as THREE from 'three'
import { loadGLBModel, loadGLBFromFile } from '../utils/gltfLoader'
import { setActiveModelKey, saveModelToCache, getModelFromCache } from '../utils/indexedDBCache'

/**
 * Tree item structure for sidebar navigation
 */
export interface TreeItem {
	id: string
	name: string
	type: string
	children: TreeItem[]
}

/**
 * Model cache state using Svelte 5 Runes
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
	 * Load a GLB model from URL (with caching)
	 * @param url - The URL of the GLB file to load
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
	 * Load a GLB model from a local file
	 * @param file - The file object
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

			console.log(`[ModelCache] Model loaded from file and cached: ${file.name}`)
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : '解析模型失敗'
			this._error = errorMessage
			console.error('[ModelCache] Failed to load model from file:', e)
		} finally {
			this._isLoading = false
		}
	}

	/**
	 * Load a GLB model from IndexedDB cache by key
	 * @param cacheKey - The cache key
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

			console.log(`[ModelCache] Model loaded from cache: ${cacheKey}`)
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : '從緩存載入模型失敗'
			this._error = errorMessage
			console.error('[ModelCache] Failed to load model from cache:', e)
		} finally {
			this._isLoading = false
		}
	}

	/**
	 * Clear the currently loaded model and reset state
	 */
	clearModel(): void {
		// Dispose of Three.js resources
		if (this._model) {
			this._model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry?.dispose()
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

		console.log('[ModelCache] Model cleared')
	}

	/**
	 * Generate hierarchical tree data from Three.js model
	 * @param object - The root object
	 * @returns Array of tree items
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
	 * Reset error state
	 */
	clearError(): void {
		this._error = null
	}
}

// Export a singleton instance
export const modelStore = new ModelCacheStore()
