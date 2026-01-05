import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

/**
 * @component 紋理與環境貼圖載入工具
 * 提供通用紋理載入 (PNG/JPG/WebP) 和高動態範圍 (HDR) 環境貼圖支持
 */

/**
 * 加載紋理（支持 PNG、JPG、WebP 等格式）
 * @param url - 紋理圖像 URL
 * @param onLoad - 加載完成回呼（可選）
 * @param onProgress - 加載進度回呼（可選）
 * @param onError - 加載錯誤回呼（可選）
 * @returns 紋理 Promise
 *
 * @example
 * ```svelte
 * <script>
 *   import { loadTexture } from '$lib/utils/textureLoader'
 *   const texture = await loadTexture('/images/diffuse.webp')
 * </script>
 * ```
 */
export function loadTexture(
	url: string,
	onLoad?: (texture: THREE.Texture) => void,
	onProgress?: (event: ProgressEvent) => void,
	onError?: (error: unknown) => void
): Promise<THREE.Texture> {
	return new Promise((resolve, reject) => {
		const loader = new THREE.TextureLoader()

		loader.load(
			url,
			(texture) => {
				onLoad?.(texture)
				resolve(texture)
			},
			onProgress,
			(error) => {
				onError?.(error)
				reject(error)
			}
		)
	})
}

/**
 * 加載 WebP 紋理
 * @deprecated 使用 {@link loadTexture} 代替，它支持所有常見格式
 * @param url - WebP 圖像 URL
 * @param onLoad - 加載完成回呼
 * @param onProgress - 加載進度回呼（可選）
 * @param onError - 加載錯誤回呼（可選）
 * @returns 紋理 Promise
 */
export function loadWebPTexture(
	url: string,
	onLoad?: (texture: THREE.Texture) => void,
	onProgress?: (event: ProgressEvent) => void,
	onError?: (error: unknown) => void
): Promise<THREE.Texture> {
	return loadTexture(url, onLoad, onProgress, onError)
}

/**
 * 加載 HDR 環境貼圖（支持高動態範圍）
 * @param url - HDR 檔案 URL
 * @returns 高動態範圍紋理 Promise
 *
 * @example
 * ```svelte
 * <script>
 *   import { loadHDREnvironment } from '$lib/utils/textureLoader'
 *   const envMap = await loadHDREnvironment('/env/studio.hdr')
 * </script>
 * ```
 */
export function loadHDREnvironment(url: string): Promise<THREE.DataTexture> {
	return new Promise((resolve, reject) => {
		const loader = new HDRLoader()
		loader.load(url, resolve, undefined, reject)
	})
}
