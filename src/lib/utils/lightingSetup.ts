/**
 * Default Lighting Setup Utility
 *
 * Provides a simple three-light system for basic scene illumination.
 */

import * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'

/**
 * 設置預設燈光系統（簡單的三光源）
 *
 * @param scene - Three.js 場景物件
 * @param renderer - Three.js 渲染器 (WebGPURenderer or WebGLRenderer)
 */
export function setupDefaultLighting(
	scene: THREE.Scene,
	renderer: WebGPURenderer | THREE.WebGLRenderer
): void {
	// 主燈（Key Light）- 白色方向光
	const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
	keyLight.position.set(60, 50, 50)
	keyLight.castShadow = false
	scene.add(keyLight)

	// 填充燈（Fill Light）- 藍色方向光
	const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.6)
	fillLight.position.set(-50, 30, 40)
	fillLight.castShadow = false
	scene.add(fillLight)

	// 背景燈（Rim Light）- 溫暖色調聚光燈
	const rimLight = new THREE.SpotLight(0xffaa88, 0.5)
	rimLight.position.set(0, 60, -80)
	rimLight.angle = Math.PI / 6
	rimLight.penumbra = 0.5
	rimLight.decay = 2
	rimLight.castShadow = false
	scene.add(rimLight)

	// 環境光 - 提供基礎照明
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
	scene.add(ambientLight)

	// 配置渲染器
	renderer.shadowMap.enabled = false
	renderer.toneMapping = THREE.ACESFilmicToneMapping
	renderer.toneMappingExposure = 1.0
	renderer.outputColorSpace = THREE.SRGBColorSpace
}
