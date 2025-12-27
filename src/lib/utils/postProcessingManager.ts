import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'

/**
 * PostProcessing 效果配置接口
 */
export interface PostProcessingConfig {
	bloomEnabled: boolean
	ssaoEnabled: boolean
	outlineEnabled: boolean
	smaaEnabled: boolean
}

/**
 * PostProcessing 管理器
 * 負責管理所有後期處理效果（Bloom、SSAO、Outline、SMAA）
 */
export class PostProcessingManager {
	private composer: EffectComposer
	private renderPass: RenderPass
	private ssaoPass?: SSAOPass
	private bloomPass?: UnrealBloomPass
	private outlinePass?: OutlinePass
	private smaaPass?: SMAAPass
	private gammaCorrectionPass: ShaderPass

	private scene: THREE.Scene
	private camera: THREE.Camera
	private renderer: THREE.WebGLRenderer

	constructor(
		scene: THREE.Scene,
		camera: THREE.Camera,
		renderer: THREE.WebGLRenderer,
		config: PostProcessingConfig
	) {
		this.scene = scene
		this.camera = camera
		this.renderer = renderer

		// 創建 EffectComposer
		this.composer = new EffectComposer(renderer)

		// 1. RenderPass（基礎渲染，必須）
		this.renderPass = new RenderPass(scene, camera)
		this.composer.addPass(this.renderPass)

		// 獲取實際渲染解析度
		const width = renderer.getSize(new THREE.Vector2()).x
		const height = renderer.getSize(new THREE.Vector2()).y

		// 2. SSAOPass（環境光遮蔽，可選）
		if (config.ssaoEnabled) {
			this.ssaoPass = new SSAOPass(scene, camera, width, height)
			this.ssaoPass.kernelRadius = 16
			this.ssaoPass.minDistance = 0.005
			this.ssaoPass.maxDistance = 0.1
			this.composer.addPass(this.ssaoPass)
		}

		// 3. UnrealBloomPass（發光效果，可選）
		if (config.bloomEnabled) {
			this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.4, 0.85)
			this.composer.addPass(this.bloomPass)
		}

		// 4. OutlinePass（選中物件輪廓，可選）
		if (config.outlineEnabled) {
			this.outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera)
			this.outlinePass.edgeStrength = 3.0
			this.outlinePass.edgeThickness = 2.0
			this.outlinePass.visibleEdgeColor.set('#00ff00') // 綠色，與 BoundingBox 一致
			this.composer.addPass(this.outlinePass)
		}

		// 5. GammaCorrectionPass（色彩校正，必須）
		this.gammaCorrectionPass = new ShaderPass(GammaCorrectionShader)
		this.composer.addPass(this.gammaCorrectionPass)

		// 6. SMAAPass（抗鋸齒，可選，最後一步）
		if (config.smaaEnabled) {
			this.smaaPass = new SMAAPass()
			this.composer.addPass(this.smaaPass)
		}

		// 確保最後一個 Pass 的 renderToScreen = true
		if (this.composer.passes.length > 0) {
			this.composer.passes[this.composer.passes.length - 1].renderToScreen = true
		}
	}

	/**
	 * 渲染場景（使用 EffectComposer）
	 */
	render(): void {
		this.composer.render()
	}

	/**
	 * 設置 Outline 目標物件
	 */
	setOutlineObjects(objects: THREE.Object3D[]): void {
		if (this.outlinePass) {
			this.outlinePass.selectedObjects = objects
		}
	}

	/**
	 * 清除 Outline 目標
	 */
	clearOutlineObjects(): void {
		if (this.outlinePass) {
			this.outlinePass.selectedObjects = []
		}
	}

	/**
	 * 處理窗口調整大小
	 */
	handleResize(width: number, height: number): void {
		this.composer.setSize(width, height)

		// 更新 SSAO Pass 解析度（如果啟用）
		if (this.ssaoPass) {
			this.ssaoPass.setSize(width, height)
		}
	}

	/**
	 * 清理資源
	 */
	dispose(): void {
		// 清理所有 Pass
		this.renderPass.dispose?.()
		this.ssaoPass?.dispose?.()
		this.bloomPass?.dispose?.()
		this.outlinePass?.dispose?.()
		this.smaaPass?.dispose?.()
		this.gammaCorrectionPass.dispose?.()

		// 清理 Composer
		this.composer.dispose?.()
	}
}
