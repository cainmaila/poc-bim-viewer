import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getModelFromCache, saveModelToCache } from './indexedDBCache'

/**
 * Result of loading a GLB model
 */
export interface LoadResult {
	scene: THREE.Group
	fromCache: boolean
}

/**
 * Progress callback function
 */
export type ProgressCallback = (progress: number) => void

/**
 * Load a GLB model with IndexedDB caching
 *
 * Loading strategy:
 * 1. Check IndexedDB cache first
 * 2. If cached: Load from cache and parse
 * 3. If not cached: Download from network → Save to cache → Parse
 *
 * @param url - The URL of the GLB file to load
 * @param onProgress - Optional callback for loading progress (0-100)
 * @returns Promise resolving to the loaded scene and cache status
 */
export async function loadGLBModel(
	url: string,
	onProgress?: ProgressCallback
): Promise<LoadResult> {
	const cacheKey = url.split('/').pop() || url

	try {
		// Step 1: Check cache first
		onProgress?.(0)
		const cachedData = await getModelFromCache(cacheKey)

		if (cachedData) {
			// Load from cache
			onProgress?.(50)
			const scene = await parseGLBFromArrayBuffer(cachedData)
			onProgress?.(100)
			return { scene, fromCache: true }
		}

		// Step 2: Download from network
		const arrayBuffer = await downloadGLB(url, (progress) => {
			// Map download progress to 0-70%
			onProgress?.(progress * 0.7)
		})

		// Step 3: Save to cache (async, don't wait)
		onProgress?.(70)
		saveModelToCache(cacheKey, arrayBuffer).catch((error) => {
			console.warn('[GLBLoader] Failed to cache model:', error)
		})

		// Step 4: Parse the model
		onProgress?.(80)
		const scene = await parseGLBFromArrayBuffer(arrayBuffer)
		onProgress?.(100)

		return { scene, fromCache: false }
	} catch (error) {
		console.error('[GLBLoader] Failed to load model:', error)
		throw error
	}
}

/**
 * Download a GLB file from a URL
 * @param url - The URL to download from
 * @param onProgress - Optional progress callback (0-1)
 * @returns Promise resolving to the ArrayBuffer
 */
async function downloadGLB(
	url: string,
	onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()

		xhr.open('GET', url, true)
		xhr.responseType = 'arraybuffer'

		xhr.onprogress = (event) => {
			if (event.lengthComputable) {
				const progress = event.loaded / event.total
				onProgress?.(progress)
			}
		}

		xhr.onload = () => {
			if (xhr.status === 200) {
				resolve(xhr.response as ArrayBuffer)
			} else {
				reject(new Error(`Failed to download GLB: ${xhr.status} ${xhr.statusText}`))
			}
		}

		xhr.onerror = () => {
			reject(new Error('Network error while downloading GLB'))
		}

		xhr.send()
	})
}

/**
 * Parse a GLB file from ArrayBuffer using GLTFLoader
 * @param arrayBuffer - The GLB file data
 * @returns Promise resolving to the parsed scene
 */
async function parseGLBFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<THREE.Group> {
	return new Promise((resolve, reject) => {
		const loader = new GLTFLoader()

		// Convert ArrayBuffer to data URL for GLTFLoader
		// Note: GLTFLoader.parse() expects the data in a specific format
		loader.parse(
			arrayBuffer,
			'', // Resource path (empty for GLB)
			(gltf) => {
				resolve(gltf.scene)
			},
			(error) => {
				reject(new Error(`Failed to parse GLB: ${error.message}`))
			}
		)
	})
}
