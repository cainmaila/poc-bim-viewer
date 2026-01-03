import type { PostProcessingConfig } from '$lib/utils/postProcessingManager'

const STORAGE_KEY = 'bim-viewer-settings'

/**
 * LocalStorage 數據結構
 */
interface StorageData {
	gridVisible: boolean
	boundingBoxVisible: boolean
	postProcessing: PostProcessingConfig
	rayBasedZoom: boolean
	fpsMode: boolean
}

export class SettingsStore {
	_gridVisible = $state(false)
	_boundingBoxVisible = $state(false)
	_rayBasedZoom = $state(false)
	_fpsMode = $state(false)
	_postProcessing = $state<PostProcessingConfig>({
		bloomEnabled: true,
		ssaoEnabled: true,
		outlineEnabled: true,
		smaaEnabled: true
	})

	private saveTimeout: ReturnType<typeof setTimeout> | null = null

	constructor() {
		// 從 localStorage 加載設置
		this.loadFromLocalStorage()
	}

	// ========== Grid 相關 ==========

	get gridVisible() {
		return this._gridVisible
	}

	set gridVisible(value: boolean) {
		this._gridVisible = value
		this.saveToLocalStorage()
	}

	toggleGrid() {
		this.gridVisible = !this.gridVisible
	}

	// ========== BoundingBox 相關 ==========

	get boundingBoxVisible() {
		return this._boundingBoxVisible
	}

	set boundingBoxVisible(value: boolean) {
		this._boundingBoxVisible = value
		this.saveToLocalStorage()
	}

	toggleBoundingBox() {
		this.boundingBoxVisible = !this.boundingBoxVisible
	}

	// ========== Ray-based Zoom 相關 ==========

	get rayBasedZoom() {
		return this._rayBasedZoom
	}

	set rayBasedZoom(value: boolean) {
		this._rayBasedZoom = value
		this.saveToLocalStorage()
	}

	toggleRayBasedZoom() {
		this.rayBasedZoom = !this.rayBasedZoom
	}

	// ========== FPS Mode 相關 ==========

	get fpsMode() {
		return this._fpsMode
	}

	set fpsMode(value: boolean) {
		this._fpsMode = value
		this.saveToLocalStorage()
	}

	toggleFPSMode() {
		this.fpsMode = !this.fpsMode
	}

	// ========== PostProcessing 相關 ==========

	get postProcessing() {
		return this._postProcessing
	}

	toggleBloom() {
		this._postProcessing.bloomEnabled = !this._postProcessing.bloomEnabled
		this.saveToLocalStorage()
	}

	toggleSSAO() {
		this._postProcessing.ssaoEnabled = !this._postProcessing.ssaoEnabled
		this.saveToLocalStorage()
	}

	toggleOutline() {
		this._postProcessing.outlineEnabled = !this._postProcessing.outlineEnabled
		this.saveToLocalStorage()
	}

	toggleSMAA() {
		this._postProcessing.smaaEnabled = !this._postProcessing.smaaEnabled
		this.saveToLocalStorage()
	}

	// ========== LocalStorage 持久化 ==========

	/**
	 * 使用 debounce 保存設置到 localStorage，避免頻繁寫入阻塞主線程
	 * 延遲 500ms，確保連續變更只寫入一次
	 */
	private saveToLocalStorage() {
		if (typeof window === 'undefined') return

		// 清除現有的計時器
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout)
		}

		// 設置新的延遲保存
		this.saveTimeout = setTimeout(() => {
			const data: StorageData = {
				gridVisible: this._gridVisible,
				boundingBoxVisible: this._boundingBoxVisible,
				rayBasedZoom: this._rayBasedZoom,
				fpsMode: this._fpsMode,
				postProcessing: this._postProcessing
			}

			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
			} catch (error) {
				console.error('Failed to save settings to localStorage:', error)
			}
		}, 500)
	}

	private loadFromLocalStorage() {
		if (typeof window === 'undefined') return

		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (!stored) return

			const data = JSON.parse(stored) as Partial<StorageData>

			// 加載設置（使用可選鏈確保向後兼容）
			this._gridVisible = data.gridVisible ?? false
			this._boundingBoxVisible = data.boundingBoxVisible ?? false
			this._rayBasedZoom = data.rayBasedZoom ?? false
			this._fpsMode = data.fpsMode ?? false
			this._postProcessing = {
				bloomEnabled: data.postProcessing?.bloomEnabled ?? true,
				ssaoEnabled: data.postProcessing?.ssaoEnabled ?? true,
				outlineEnabled: data.postProcessing?.outlineEnabled ?? true,
				smaaEnabled: data.postProcessing?.smaaEnabled ?? true
			}
		} catch (error) {
			console.error('Failed to load settings from localStorage:', error)
		}
	}
}

export const settingsStore = new SettingsStore()
