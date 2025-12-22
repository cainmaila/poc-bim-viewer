import * as THREE from 'three'
import { loadGLBModel } from '../utils/gltfLoader'

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

	get fromCache() {
		return this._fromCache
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

		try {
			const result = await loadGLBModel(url, (progress) => {
				this._loadProgress = Math.round(progress)
			})

			this._model = result.scene
			this._fromCache = result.fromCache

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

		console.log('[ModelCache] Model cleared')
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
