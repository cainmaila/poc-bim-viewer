import type { PostProcessingConfig } from '$lib/utils/postProcessingManager'

const STORAGE_KEY = 'bim-viewer-settings'

/**
 * LocalStorage 數據結構
 */
interface StorageData {
	gridVisible: boolean
	boundingBoxVisible: boolean
	postProcessing: PostProcessingConfig
}

export class SettingsStore {
	_gridVisible = $state(false)
	_boundingBoxVisible = $state(false)
	_postProcessing = $state<PostProcessingConfig>({
		bloomEnabled: true,
		ssaoEnabled: true,
		outlineEnabled: true,
		smaaEnabled: true
	})

	private _onGridChange: ((visible: boolean) => void) | null = null
	private _onBoundingBoxChange: ((visible: boolean) => void) | null = null
	private _onPostProcessingChange: ((config: PostProcessingConfig) => void) | null = null

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
		this._onGridChange?.(value)
		this.saveToLocalStorage()
	}

	toggleGrid() {
		this.gridVisible = !this._gridVisible
	}

	onGridVisibilityChange(callback: (visible: boolean) => void) {
		this._onGridChange = callback
	}

	// ========== BoundingBox 相關 ==========

	get boundingBoxVisible() {
		return this._boundingBoxVisible
	}

	set boundingBoxVisible(value: boolean) {
		this._boundingBoxVisible = value
		this._onBoundingBoxChange?.(value)
		this.saveToLocalStorage()
	}

	toggleBoundingBox() {
		this.boundingBoxVisible = !this._boundingBoxVisible
	}

	onBoundingBoxVisibilityChange(callback: (visible: boolean) => void) {
		this._onBoundingBoxChange = callback
	}

	// ========== PostProcessing 相關 ==========

	get postProcessing() {
		return this._postProcessing
	}

	toggleBloom() {
		this._postProcessing.bloomEnabled = !this._postProcessing.bloomEnabled
		this._onPostProcessingChange?.(this._postProcessing)
		this.saveToLocalStorage()
	}

	toggleSSAO() {
		this._postProcessing.ssaoEnabled = !this._postProcessing.ssaoEnabled
		this._onPostProcessingChange?.(this._postProcessing)
		this.saveToLocalStorage()
	}

	toggleOutline() {
		this._postProcessing.outlineEnabled = !this._postProcessing.outlineEnabled
		this._onPostProcessingChange?.(this._postProcessing)
		this.saveToLocalStorage()
	}

	toggleSMAA() {
		this._postProcessing.smaaEnabled = !this._postProcessing.smaaEnabled
		this._onPostProcessingChange?.(this._postProcessing)
		this.saveToLocalStorage()
	}

	onPostProcessingChange(callback: (config: PostProcessingConfig) => void) {
		this._onPostProcessingChange = callback
	}

	// ========== LocalStorage 持久化 ==========

	private saveToLocalStorage() {
		if (typeof window === 'undefined') return

		const data: StorageData = {
			gridVisible: this._gridVisible,
			boundingBoxVisible: this._boundingBoxVisible,
			postProcessing: this._postProcessing
		}

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
		} catch (error) {
			console.error('Failed to save settings to localStorage:', error)
		}
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
