/**
 * Unified Database Layer using Dexie.js
 *
 * Centralized IndexedDB management for:
 * - Model caching (GLB files)
 * - Application settings
 * - BIM property overrides
 */

import Dexie, { type EntityTable } from 'dexie'
import type { BIMSettings } from '$lib/types/bimSettings'

/**
 * Dexie database instance
 */
class BIMViewerDatabase extends Dexie {
	models!: EntityTable<{ key: string; data: ArrayBuffer }, 'key'>
	settings!: EntityTable<{ key: string; value: string }, 'key'>
	bimSettings!: EntityTable<BIMSettings, 'modelKey'>

	constructor() {
		super('bim-viewer-db') // 新資料庫名稱，避免升級衝突

		// Version 1: Clean Dexie schema
		this.version(1).stores({
			models: 'key',
			settings: 'key',
			bimSettings: 'modelKey'
		})
	}
}

// Export singleton instance
export const db = new BIMViewerDatabase()

// ============================================================================
// Model Cache Operations
// ============================================================================

/**
 * Save model data to cache
 */
export async function saveModelToCache(key: string, data: ArrayBuffer): Promise<void> {
	try {
		await db.models.put({ key, data })
		console.log(`[Database] Model saved to cache: ${key}`)
	} catch (error) {
		console.error('[Database] Failed to save model to cache:', error)
		throw error
	}
}

/**
 * Get model data from cache
 */
export async function getModelFromCache(key: string): Promise<ArrayBuffer | null> {
	try {
		const record = await db.models.get(key)
		if (record) {
			console.log(`[Database] Model loaded from cache: ${key}`)
			return record.data
		}
		console.log(`[Database] Model not found in cache: ${key}`)
		return null
	} catch (error) {
		console.error('[Database] Failed to get model from cache:', error)
		return null
	}
}

/**
 * Check if model exists in cache
 */
export async function hasModelInCache(key: string): Promise<boolean> {
	try {
		const record = await db.models.get(key)
		return record !== undefined
	} catch (error) {
		console.error('[Database] Failed to check cache:', error)
		return false
	}
}

/**
 * Get all cached model keys
 */
export async function getCachedModelKeys(): Promise<string[]> {
	try {
		const records = await db.models.toArray()
		return records.map((r) => r.key)
	} catch (error) {
		console.error('[Database] Failed to get cached model keys:', error)
		return []
	}
}

/**
 * Clear all cached models
 */
export async function clearCache(): Promise<void> {
	try {
		await db.models.clear()
		console.log('[Database] Cache cleared')
	} catch (error) {
		console.error('[Database] Failed to clear cache:', error)
		throw error
	}
}

// ============================================================================
// Settings Operations
// ============================================================================

/**
 * Set active model key
 */
export async function setActiveModelKey(key: string): Promise<void> {
	try {
		await db.settings.put({ key: 'activeModelKey', value: key })
		console.log(`[Database] Active model key set to: ${key}`)
	} catch (error) {
		console.error('[Database] Failed to set active model key:', error)
	}
}

/**
 * Get active model key
 */
export async function getActiveModelKey(): Promise<string | null> {
	try {
		const record = await db.settings.get('activeModelKey')
		return record?.value || null
	} catch (error) {
		console.error('[Database] Failed to get active model key:', error)
		return null
	}
}

// ============================================================================
// BIM Settings Operations
// ============================================================================

/**
 * Save BIM settings
 */
export async function saveBIMSettings(modelKey: string, settings: BIMSettings): Promise<void> {
	try {
		await db.bimSettings.put(settings)
		console.log(`[Database] BIM settings saved: ${modelKey}`)
	} catch (error) {
		console.error('[Database] Failed to save BIM settings:', error)
		throw error
	}
}

/**
 * Get BIM settings
 */
export async function getBIMSettings(modelKey: string): Promise<BIMSettings | null> {
	try {
		const settings = await db.bimSettings.get(modelKey)
		if (settings) {
			console.log(`[Database] BIM settings loaded: ${modelKey}`)
			return settings
		}
		console.log(`[Database] No BIM settings found for: ${modelKey}`)
		return null
	} catch (error) {
		console.error('[Database] Failed to get BIM settings:', error)
		return null
	}
}

/**
 * Delete BIM settings
 */
export async function deleteBIMSettings(modelKey: string): Promise<void> {
	try {
		await db.bimSettings.delete(modelKey)
		console.log(`[Database] BIM settings deleted: ${modelKey}`)
	} catch (error) {
		console.error('[Database] Failed to delete BIM settings:', error)
		throw error
	}
}

/**
 * Check if BIM settings exist
 */
export async function hasBIMSettings(modelKey: string): Promise<boolean> {
	try {
		const settings = await getBIMSettings(modelKey)
		return settings !== null
	} catch {
		return false
	}
}
