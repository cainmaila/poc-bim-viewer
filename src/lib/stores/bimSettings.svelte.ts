/**
 * BIM Settings Store
 *
 * Manages BIM property overrides for the loaded model.
 * Uses Svelte 5 Runes for reactive state management.
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
 * BIM Settings管理 Store (Svelte 5 Runes)
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
	 * Initialize BIM settings for a model
	 *
	 * Builds path mapping, loads settings from IndexedDB (or creates new),
	 * and generates enhanced tree data.
	 *
	 * @param modelKey - Model identifier (filename)
	 * @param sceneRoot - Three.js model root node
	 */
	async initForModel(modelKey: string, sceneRoot: THREE.Group): Promise<void> {
		// Store scene root reference for future updates
		this._sceneRoot = sceneRoot

		// 1. Build path mapping
		this._pathMapping = buildPathMapping(sceneRoot)
		console.log(`[BIMSettings] Built path mapping: ${this._pathMapping.size} nodes`)

		// 2. Load settings from IndexedDB
		const savedSettings = await getBIMSettings(modelKey)

		if (savedSettings) {
			this._settings = savedSettings
			console.log(`[BIMSettings] Loaded settings for model: ${modelKey}`)
		} else {
			// Create new settings
			this._settings = {
				modelKey,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				nodeOverrides: {}
			}
			console.log(`[BIMSettings] Created new settings for model: ${modelKey}`)
		}

		// 3. Generate enhanced tree data
		this._updateEnhancedTreeData(sceneRoot)
	}

	/**
	 * Set or update node override properties
	 *
	 * @param path - Node path
	 * @param overrides - Properties to override
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
	 * Remove node override
	 *
	 * @param path - Node path
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
	 * Reset all visibility overrides (restore all nodes to visible)
	 * Keeps other overrides like displayName intact
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
	 * Export settings as JSON string
	 *
	 * @returns JSON string of settings
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
	 * Import settings from JSON
	 *
	 * Validates JSON format and checks model key match.
	 * Completely replaces existing settings.
	 *
	 * @param json - JSON string to import
	 * @param currentModelKey - Current model key for validation
	 * @returns Import result
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
			this._settings = importedData.settings

			// 更新為當前模型的 key 和時間戳
			this._settings.modelKey = currentModelKey
			this._settings.updatedAt = new Date().toISOString()

			// Save to IndexedDB (convert to plain object using $state.snapshot)
			await saveBIMSettings(currentModelKey, $state.snapshot(this._settings))

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
	 * Clear current settings (memory only)
	 */
	clear(): void {
		this._settings = null
		this._pathMapping.clear()
		this._enhancedTreeData = []
		this._sceneRoot = null
		console.log('[BIMSettings] Cleared settings from memory')
	}

	/**
	 * Delete settings from IndexedDB and clear memory
	 *
	 * @param modelKey - Model identifier
	 */
	async deleteSettings(modelKey: string): Promise<void> {
		await deleteBIMSettings(modelKey)
		this.clear()
		console.log(`[BIMSettings] Deleted settings for model: ${modelKey}`)
	}

	/**
	 * Get node path by UUID
	 *
	 * @param uuid - Three.js object UUID
	 * @returns Node path or undefined
	 */
	getPathByUUID(uuid: string): NodePath | undefined {
		return this._pathMapping.get(uuid)
	}

	/**
	 * Update enhanced tree data (internal)
	 *
	 * @param sceneRoot - Three.js model root node
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
