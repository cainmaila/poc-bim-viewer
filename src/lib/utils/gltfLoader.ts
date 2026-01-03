import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getModelFromCache, saveModelToCache } from './database'

/**
 * 載入 GLB 模型的結果
 */
export interface LoadResult {
	scene: THREE.Group
	fromCache: boolean
}

/**
 * 進度回呼函式
 */
export type ProgressCallback = (progress: number) => void

/**
 * 以 IndexedDB 快取載入 GLB 模型
 *
 * 載入流程：
 * 1. 先檢查 IndexedDB 快取
 * 2. 若有快取：從快取讀取並解析
 * 3. 若無快取：從網路下載 → 儲存至快取 → 解析
 *
 * @param url - 要載入的 GLB 檔案 URL
 * @param onProgress - 選填：載入進度回呼（0-100）
 * @returns 解析完成的場景與是否來自快取的 Promise
 */
export async function loadGLBModel(
	url: string,
	onProgress?: ProgressCallback
): Promise<LoadResult> {
	const cacheKey = url.split('/').pop() || url

	try {
		// 步驟1：先檢查快取
		onProgress?.(0)
		const cachedData = await getModelFromCache(cacheKey)

		if (cachedData) {
			// 從快取載入
			onProgress?.(50)
			const scene = await parseGLBFromArrayBuffer(cachedData)
			onProgress?.(100)
			return { scene, fromCache: true }
		}

		// 步驟2：從網路下載
		const arrayBuffer = await downloadGLB(url, (progress) => {
			// 將下載進度映射到0-70%
			onProgress?.(progress * 0.7)
		})

		// 步驟3：保存到快取（異步，不等待）
		onProgress?.(70)
		saveModelToCache(cacheKey, arrayBuffer).catch((error: unknown) => {
			console.warn('[GLBLoader] Failed to cache model:', error)
		})

		// 步驟4：解析模型
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
 * 從本機 File 物件載入 GLB 模型
 * @param file - 要載入的 File 物件
 * @param onProgress - 選填：進度回呼
 */
export async function loadGLBFromFile(
	file: File,
	onProgress?: ProgressCallback
): Promise<LoadResult> {
	try {
		onProgress?.(0)
		const arrayBuffer = await file.arrayBuffer()
		onProgress?.(50)

		const scene = await parseGLBFromArrayBuffer(arrayBuffer)
		onProgress?.(100)

		return { scene, fromCache: false }
	} catch (error) {
		console.error('[GLBLoader] Failed to load model from file:', error)
		throw error
	}
}

/**
 * 從 URL 下載 GLB 檔案
 * @param url - 下載來源的 URL
 * @param onProgress - 選填：進度回呼（0-1）
 * @returns 下載完成的 ArrayBuffer 之 Promise
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
 * 使用 GLTFLoader 從 ArrayBuffer 解析 GLB 檔案
 * @param arrayBuffer - GLB 檔案的資料
 * @returns 解析後場景之 Promise
 */
async function parseGLBFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<THREE.Group> {
	return new Promise((resolve, reject) => {
		const loader = new GLTFLoader()

		// 將 ArrayBuffer 轉為 GLTFLoader 可用的資料 URL
		// 注意：GLTFLoader.parse() 預期資料採用特定格式
		loader.parse(
			arrayBuffer,
			'', // 資源路徑（GLB 為空）
			(gltf) => {
				resolve(gltf.scene)
			},
			(error) => {
				reject(new Error(`Failed to parse GLB: ${error.message}`))
			}
		)
	})
}
