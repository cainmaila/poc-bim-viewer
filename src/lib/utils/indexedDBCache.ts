import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/**
 * IndexedDB schema for model caching
 */
interface ModelCacheDB extends DBSchema {
	models: {
		key: string
		value: ArrayBuffer
	}
}

const DB_NAME = 'bim-viewer-cache'
const DB_VERSION = 1
const STORE_NAME = 'models'

/**
 * Open or create the IndexedDB database
 */
async function getDB(): Promise<IDBPDatabase<ModelCacheDB>> {
	return openDB<ModelCacheDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// Create the models object store if it doesn't exist
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME)
			}
		}
	})
}

/**
 * Save model data to IndexedDB cache
 * @param key - The model identifier (e.g., 'building.glb')
 * @param data - The model data as ArrayBuffer
 */
export async function saveModelToCache(key: string, data: ArrayBuffer): Promise<void> {
	try {
		const db = await getDB()
		await db.put(STORE_NAME, data, key)
		console.log(`[IndexedDB] Model saved to cache: ${key}`)
	} catch (error) {
		console.error('[IndexedDB] Failed to save model to cache:', error)
		throw error
	}
}

/**
 * Get model data from IndexedDB cache
 * @param key - The model identifier (e.g., 'building.glb')
 * @returns The cached model data, or null if not found
 */
export async function getModelFromCache(key: string): Promise<ArrayBuffer | null> {
	try {
		const db = await getDB()
		const data = await db.get(STORE_NAME, key)

		if (data) {
			console.log(`[IndexedDB] Model loaded from cache: ${key}`)
			return data
		}

		console.log(`[IndexedDB] Model not found in cache: ${key}`)
		return null
	} catch (error) {
		console.error('[IndexedDB] Failed to get model from cache:', error)
		return null
	}
}

/**
 * Check if a model exists in the cache
 * @param key - The model identifier (e.g., 'building.glb')
 * @returns True if the model exists in cache, false otherwise
 */
export async function hasModelInCache(key: string): Promise<boolean> {
	try {
		const db = await getDB()
		const data = await db.get(STORE_NAME, key)
		return data !== undefined
	} catch (error) {
		console.error('[IndexedDB] Failed to check cache:', error)
		return false
	}
}

/**
 * Clear all cached models
 */
export async function clearCache(): Promise<void> {
	try {
		const db = await getDB()
		await db.clear(STORE_NAME)
		console.log('[IndexedDB] Cache cleared')
	} catch (error) {
		console.error('[IndexedDB] Failed to clear cache:', error)
		throw error
	}
}

/**
 * Get all cached model keys
 * @returns Array of model keys in the cache
 */
export async function getCachedModelKeys(): Promise<string[]> {
	try {
		const db = await getDB()
		const keys = await db.getAllKeys(STORE_NAME)
		return keys as string[]
	} catch (error) {
		console.error('[IndexedDB] Failed to get cached model keys:', error)
		return []
	}
}
