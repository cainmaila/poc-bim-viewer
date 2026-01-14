/**
 * BIM 設定 Store
 *
 * 管理已載入模型的 BIM 屬性覆寫。
 * 使用 Svelte 5 Runes 進行響應式狀態管理。
 */

import type * as THREE from 'three'
import type {
	BIMSettings,
	NodePath,
	NodeOverrides,
	EnhancedTreeItem,
	BIMSettingsExport
} from '$lib/types/bimSettings'
import { saveBIMSettings, getBIMSettings, deleteBIMSettings } from '$lib/utils/database'
import { buildPathMapping, generateEnhancedTreeData } from '$lib/utils/pathGenerator'
import { validateBIMSettingsImport } from '$lib/schemas/bimSettings'

/**
 * BIM Settings 管理 Store（Svelte 5 Runes）
 */
class BIMSettingsStore {
	// Current settings (reactive)
	private _settings = $state<BIMSettings | null>(null)

	// UUID to NodePath mapping (reactive)
	private _pathMapping = $state<Map<string, NodePath>>(new Map())

	// Enhanced tree data with overrides applied (reactive)
	private _enhancedTreeData = $state<EnhancedTreeItem[]>([])

	// Store reference to scene root for regenerating tree data
	private _sceneRoot: THREE.Group | null = null

	// Getters
	get settings() {
		return this._settings
	}

	get pathMapping() {
		return this._pathMapping
	}

	get enhancedTreeData() {
		return this._enhancedTreeData
	}

	/**
	 * 初始化指定模型的 BIM 設定
	 *
	 * 建立路徑對應、從 IndexedDB 載入（或建立新設定），
	 * 並生成加強的樹狀資料。
	 *
	 * @param modelKey - 模型識別鍵（檔名）
	 * @param sceneRoot - Three.js 模型根節點
	 */
	async initForModel(modelKey: string, sceneRoot: THREE.Group): Promise<void> {
		// Store scene root reference for future updates
		this._sceneRoot = sceneRoot

		// 1. Build path mapping
		this._pathMapping = await buildPathMapping(sceneRoot)

		// 2. Load settings from IndexedDB
		const savedSettings = await getBIMSettings(modelKey)

		if (savedSettings) {
			this._settings = savedSettings
		} else {
			// Create new settings
			this._settings = {
				modelKey,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				nodeOverrides: {}
			}
		}

		// 3. Generate enhanced tree data
		this._updateEnhancedTreeData(sceneRoot)
	}

	/**
	 * 設定或更新節點的覆寫屬性
	 *
	 * @param path - 節點路徑
	 * @param overrides - 要覆寫的屬性
	 */
	async setNodeOverride(path: NodePath, overrides: Partial<NodeOverrides>): Promise<void> {
		if (!this._settings) {
			console.warn('[BIMSettings] Cannot set override: settings not initialized')
			return
		}

		// Merge overrides
		this._settings.nodeOverrides[path] = {
			...this._settings.nodeOverrides[path],
			...overrides
		}

		this._settings.updatedAt = new Date().toISOString()

		// Save to IndexedDB (convert to plain object using Svelte snapshot)
		await saveBIMSettings(this._settings.modelKey, $state.snapshot(this._settings))

		// Regenerate enhanced tree data
		if (this._sceneRoot) {
			this._updateEnhancedTreeData(this._sceneRoot)
		}

		console.log(`[BIMSettings] Updated overrides for path: ${path}`, overrides)
	}

	/**
	 * 移除節點的覆寫設定
	 *
	 * @param path - 節點路徑
	 */
	async removeNodeOverride(path: NodePath): Promise<void> {
		if (!this._settings) return

		delete this._settings.nodeOverrides[path]
		this._settings.updatedAt = new Date().toISOString()

		// Save to IndexedDB (convert to plain object using Svelte snapshot)
		await saveBIMSettings(this._settings.modelKey, $state.snapshot(this._settings))
		console.log(`[BIMSettings] Removed overrides for path: ${path}`)
	}

	/**
	 * 重置所有可見性覆寫（將所有節點還原為可見）
	 * 其他覆寫（例如 displayName）會保留
	 */
	async resetAllVisibility(): Promise<void> {
		if (!this._settings) return

		// Remove visibility property from all overrides
		for (const path in this._settings.nodeOverrides) {
			const override = this._settings.nodeOverrides[path]
			if (override.visible !== undefined) {
				delete override.visible

				// If no other overrides remain, remove the entire entry
				if (Object.keys(override).length === 0) {
					delete this._settings.nodeOverrides[path]
				}
			}
		}

		this._settings.updatedAt = new Date().toISOString()

		// Save to IndexedDB (convert to plain object using Svelte snapshot)
		await saveBIMSettings(this._settings.modelKey, $state.snapshot(this._settings))

		// Regenerate enhanced tree data
		if (this._sceneRoot) {
			this._updateEnhancedTreeData(this._sceneRoot)
		}

		console.log('[BIMSettings] Reset all visibility overrides')
	}

	/**
	 * 匯出設定為 JSON 字串
	 *
	 * @returns 設定的 JSON 字串
	 */
	exportSettings(): string {
		if (!this._settings) {
			throw new Error('No settings to export')
		}

		const exportData: BIMSettingsExport = {
			version: '1.0.0',
			modelKey: this._settings.modelKey,
			exportedAt: new Date().toISOString(),
			settings: this._settings
		}

		return JSON.stringify(exportData, null, 2)
	}

	/**
	 * 從 JSON 匯入設定
	 *
	 * 會驗證 JSON 格式並檢查匯入資料，
	 * 可完整覆蓋現有設定。
	 *
	 * @param json - 要匯入的 JSON 字串
	 * @param currentModelKey - 當前模型的 key（用於驗證和存檔）
	 * @returns 匯入結果
	 */
	async importSettings(
		json: string,
		currentModelKey: string
	): Promise<{
		success: boolean
		error?: string
	}> {
		try {
			const parsed = JSON.parse(json)
			const validation = validateBIMSettingsImport(parsed)

			if (!validation.success) {
				return { success: false, error: validation.error }
			}

			const importedData = validation.data!

			// Completely replace settings (允許跨模型匯入)
			// Update model key and timestamp
			const updatedSettings: BIMSettings = {
				...importedData.settings,
				modelKey: currentModelKey,
				updatedAt: new Date().toISOString()
			}
			this._settings = updatedSettings

			// Save to IndexedDB (convert to plain object using $state.snapshot)
			await saveBIMSettings(currentModelKey, $state.snapshot(updatedSettings))

			// 重新生成 tree data（會自動過濾不存在的 path）
			if (this._sceneRoot) {
				this._updateEnhancedTreeData(this._sceneRoot)
			}

			console.log(
				`[BIMSettings] Imported settings from "${importedData.modelKey}" to "${currentModelKey}". ` +
					`Unmapped paths will be automatically skipped.`
			)
			return { success: true }
		} catch (e) {
			return {
				success: false,
				error: e instanceof Error ? e.message : 'Invalid JSON format'
			}
		}
	}

	/**
	 * 清除目前的記憶體設定（僅記憶體，不刪除 IndexedDB）
	 */
	clear(): void {
		this._settings = null
		this._pathMapping.clear()
		this._enhancedTreeData = []
		this._sceneRoot = null
		console.log('[BIMSettings] Cleared settings from memory')
	}

	/**
	 * 從 IndexedDB 刪除指定模型的設定並清除記憶體
	 *
	 * @param modelKey - 模型識別鍵
	 */
	async deleteSettings(modelKey: string): Promise<void> {
		await deleteBIMSettings(modelKey)
		this.clear()
		console.log(`[BIMSettings] Deleted settings for model: ${modelKey}`)
	}

	/**
	 * 以 UUID 取得節點路徑
	 *
	 * @param uuid - Three.js 物件的 UUID
	 * @returns 節點路徑或 undefined
	 */
	getPathByUUID(uuid: string): NodePath | undefined {
		return this._pathMapping.get(uuid)
	}

	/**
	 * 更新加強樹狀資料（內部使用）
	 *
	 * @param sceneRoot - Three.js 模型根節點
	 */
	private _updateEnhancedTreeData(sceneRoot: THREE.Group): void {
		if (!this._settings) return

		this._enhancedTreeData = generateEnhancedTreeData(
			sceneRoot,
			this._pathMapping,
			this._settings.nodeOverrides
		)
	}
}

// Export singleton instance
export const bimSettingsStore = new BIMSettingsStore()
