import * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

/**
 * 電影級燈光配置
 */
export interface CinematicLightingConfig {
	// 三點照明 - 主燈
	keyLightIntensity?: number
	keyLightColor?: string

	// 三點照明 - 填充燈
	fillLightIntensity?: number
	fillLightColor?: string

	// 三點照明 - 背燈
	rimLightIntensity?: number
	rimLightColor?: string

	// 環境光
	ambientIntensity?: number
	ambientColor?: string

	// HDR 環境強度
	environmentIntensity?: number
	backgroundIntensity?: number

	// 渲染器設置
	tonemappingExposure?: number
	toneMappingType?: THREE.ToneMapping

	// HDRI 路徑
	hdriPath?: string

	// 陰影設置
	shadowMapType?: THREE.ShadowMapType
	shadowMapSize?: number
	shadowBias?: number

	// 燈光跟隨攝影機
	followCamera?: boolean
	cameraFollowDistance?: number
	cameraFollowHeight?: number
}

/**
 * 電影級燈光管理器
 * 實現三點照明系統、HDRI 環境貼圖、陰影和色調映射
 * 支持燈光跟隨攝影機位置
 */
export class CinematicLightingManager {
	private scene: THREE.Scene
	private camera: THREE.PerspectiveCamera
	private renderer: WebGPURenderer
	private config: CinematicLightingConfig

	// 三點照明燈光
	private keyLight: THREE.DirectionalLight
	private fillLight: THREE.DirectionalLight
	private rimLight: THREE.SpotLight
	private ambientLight: THREE.AmbientLight

	// HDRI 相關
	private envMap: THREE.Texture | null = null
	private hdriLoader: HDRLoader

	// 更新跟隨
	private keyLightTarget: THREE.Vector3
	private fillLightTarget: THREE.Vector3
	private rimLightTarget: THREE.Vector3

	constructor(
		scene: THREE.Scene,
		camera: THREE.PerspectiveCamera,
		renderer: WebGPURenderer,
		config: CinematicLightingConfig = {}
	) {
		this.scene = scene
		this.camera = camera
		this.renderer = renderer
		this.hdriLoader = new HDRLoader()

		// 合併配置與預設值
		this.config = {
			keyLightIntensity: 1.0,
			keyLightColor: '#ffffff',
			fillLightIntensity: 0.4,
			fillLightColor: '#87ceeb',
			rimLightIntensity: 0.5,
			rimLightColor: '#ffaa88',
			ambientIntensity: 0.3,
			ambientColor: '#ffffff',
			environmentIntensity: 0.5,
			backgroundIntensity: 0.2,
			tonemappingExposure: 0.7,
			toneMappingType: THREE.ACESFilmicToneMapping,
			shadowMapType: THREE.PCFSoftShadowMap,
			shadowMapSize: 2048,
			shadowBias: -0.0001,
			followCamera: true,
			cameraFollowDistance: 60,
			cameraFollowHeight: 40,
			...config
		}

		// 初始化燈光目標位置
		this.keyLightTarget = new THREE.Vector3()
		this.fillLightTarget = new THREE.Vector3()
		this.rimLightTarget = new THREE.Vector3()

		// 初始化燈光
		this.keyLight = this.createKeyLight()
		this.fillLight = this.createFillLight()
		this.rimLight = this.createRimLight()
		this.ambientLight = this.createAmbientLight()

		// 添加燈光到場景
		this.scene.add(this.keyLight)
		this.scene.add(this.fillLight)
		this.scene.add(this.rimLight)
		this.scene.add(this.ambientLight)

		// 配置渲染器
		this.configureRenderer()
	}

	/**
	 * 創建主燈（Key Light）
	 * 強烈的方向光，使用烘培陰影，定義主要光源方向
	 */
	private createKeyLight(): THREE.DirectionalLight {
		const light = new THREE.DirectionalLight(
			this.config.keyLightColor,
			this.config.keyLightIntensity
		)

		// 初始位置（相對於場景中心）
		light.position.set(60, 50, 50)
		light.target.position.copy(this.scene.position)

		// 禁用動態陰影投射，使用烘培陰影
		light.castShadow = false

		return light
	}

	/**
	 * 創建填充燈（Fill Light）
	 * 柔和的藍光，減低陰影部分的暗度，補充對比
	 */
	private createFillLight(): THREE.DirectionalLight {
		const light = new THREE.DirectionalLight(
			this.config.fillLightColor,
			this.config.fillLightIntensity
		)

		// 位置相反於主燈，減少陰影硬度
		light.position.set(-50, 30, 40)
		light.target.position.copy(this.scene.position)

		// 填充燈通常不需要投射陰影
		light.castShadow = false

		return light
	}

	/**
	 * 創建背燈（Rim Light）
	 * 聚光燈，從後方勾勒物體輪廓，增強三維感和電影感
	 */
	private createRimLight(): THREE.SpotLight {
		const light = new THREE.SpotLight(this.config.rimLightColor, this.config.rimLightIntensity)

		// 背燈位置（後上方）
		light.position.set(0, 60, -80)
		light.target.position.copy(this.scene.position)

		// 聚光燈參數：角度、半影、衰減
		light.angle = Math.PI / 4 // 45 度，更寬的覆蓋範圍
		light.penumbra = 1.0 // 最大柔化邊緣，模擬散射
		light.decay = 1 // 降低衰減，讓光線傳播更遠

		// 背燈通常不需要投射陰影
		light.castShadow = false

		return light
	}

	/**
	 * 創建環境光
	 * 均勻的環境照明，提供基礎亮度
	 */
	private createAmbientLight(): THREE.AmbientLight {
		const light = new THREE.AmbientLight(this.config.ambientColor, this.config.ambientIntensity)
		return light
	}

	/**
	 * 配置 WebGL 渲染器以支持電影級效果
	 */
	private configureRenderer() {
		// 禁用動態陰影映射，使用烘培陰影
		// @ts-expect-error - WebGPURenderer might not share exact API with WebGLRenderer
		if (this.renderer.shadowMap) {
			this.renderer.shadowMap.enabled = false
		}

		// 配置色調映射
		this.renderer.toneMapping = this.config.toneMappingType!
		this.renderer.toneMappingExposure = this.config.tonemappingExposure!

		// 啟用 sRGB 色彩空間
		this.renderer.outputColorSpace = THREE.SRGBColorSpace
	}

	/**
	 * 加載 HDRI 環境貼圖
	 * @param hdriPath - HDR 檔案路徑
	 */
	async loadHDRIEnvironment(hdriPath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.hdriLoader.load(
				hdriPath,
				(texture) => {
					// 設置環境貼圖
					// @ts-expect-error - PMREMGenerator expects WebGLRenderer
					const pmremGenerator = new THREE.PMREMGenerator(this.renderer)
					const envMap = pmremGenerator.fromEquirectangular(texture).texture

					this.scene.environment = envMap
					this.scene.background = envMap
					this.scene.environmentIntensity = this.config.environmentIntensity ?? 1.0
					this.scene.backgroundIntensity = this.config.backgroundIntensity ?? 1.0

					this.envMap = envMap

					// 清理 PMREM 生成器
					pmremGenerator.dispose()
					texture.dispose()

					resolve()
				},
				undefined,
				reject
			)
		})
	}

	/**
	 * 更新燈光跟隨攝影機位置
	 * 基於攝影機方向重新定位三點照明系統
	 */
	updateLightsFollowCamera(): void {
		if (!this.config.followCamera) return

		// 計算攝影機向前方向
		const cameraDirection = new THREE.Vector3()
		this.camera.getWorldDirection(cameraDirection)

		// 計算攝影機上方向
		const cameraUp = this.camera.up.clone()

		// 計算攝影機右方向
		const cameraRight = new THREE.Vector3().crossVectors(cameraDirection, cameraUp).normalize()

		const distance = this.config.cameraFollowDistance!
		const height = this.config.cameraFollowHeight!

		// 主燈：在攝影機前上方，更偏側面以強調立體感，降低高度模擬夕陽
		this.keyLightTarget.copy(this.camera.position)
		this.keyLightTarget.addScaledVector(cameraDirection, distance * 0.2)
		this.keyLightTarget.addScaledVector(cameraRight, distance * 0.8)
		this.keyLightTarget.y += height * 0.4 // 降低主燈高度 (夕陽角度)

		// 填充燈：在攝影機前下方，稍偏左，降低高度以填充陰影
		this.fillLightTarget.copy(this.camera.position)
		this.fillLightTarget.addScaledVector(cameraDirection, distance * 0.2)
		this.fillLightTarget.addScaledVector(cameraRight, -distance * 0.6)
		this.fillLightTarget.y += height * 0.2

		// 背燈：在攝影機後上方，更高更遠以勾勒輪廓
		this.rimLightTarget.copy(this.camera.position)
		this.rimLightTarget.addScaledVector(cameraDirection, -distance * 0.8)
		this.rimLightTarget.y += height * 2.0 // 提高背燈高度，確保輪廓清晰

		// 應用新位置（使用平滑插值以避免抖動）
		const smoothFactor = 0.1
		this.keyLight.position.lerp(this.keyLightTarget, smoothFactor)
		this.fillLight.position.lerp(this.fillLightTarget, smoothFactor)
		this.rimLight.position.lerp(this.rimLightTarget, smoothFactor)

		// 更新光源目標為場景中心或攝影機注視點
		const sceneCenter = new THREE.Vector3()
		this.keyLight.target.position.copy(sceneCenter)
		this.fillLight.target.position.copy(sceneCenter)
		this.rimLight.target.position.copy(sceneCenter)
	}

	/**
	 * 更新場景中所有對象的材質以支持電影級效果
	 * 轉換為 MeshStandardMaterial 或 MeshPhysicalMaterial 以支持 HDRI 反射
	 */
	updateMaterialsForCinematic(): void {
		this.scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				const material = object.material as THREE.Material

				// 確保法線被正確計算
				if (object.geometry) {
					object.geometry.computeVertexNormals()
				}

				// 如果是標準材質或物理材質，啟用陰影投射
				if (
					material instanceof THREE.MeshStandardMaterial ||
					material instanceof THREE.MeshPhysicalMaterial
				) {
					material.needsUpdate = true
					// 支持雙面渲染以防止小三角形問題
					material.side = THREE.DoubleSide
					material.flatShading = false // 確保光滑著色
				}

				// 啟用陰影
				object.castShadow = true
				object.receiveShadow = true
			}
		})
	}

	/**
	 * 設置特定對象的電影材質
	 * @param object - Three.js 對象
	 * @param roughness - 粗糙度 (0-1)
	 * @param metalness - 金屬度 (0-1)
	 */
	setObjectCinematicMaterial(
		object: THREE.Object3D,
		roughness: number = 0.5,
		metalness: number = 0.5
	): void {
		if (object instanceof THREE.Mesh) {
			const originalMaterial = object.material

			// 確保法線被正確計算
			if (object.geometry) {
				object.geometry.computeVertexNormals()
			}

			// 從原始材質中提取顏色
			let color: THREE.Color | number = 0xffffff
			if (originalMaterial instanceof THREE.MeshStandardMaterial) {
				color = originalMaterial.color.clone()
			} else if (originalMaterial instanceof THREE.MeshPhysicalMaterial) {
				color = originalMaterial.color.clone()
			} else if (
				originalMaterial instanceof THREE.MeshPhongMaterial ||
				originalMaterial instanceof THREE.MeshLambertMaterial
			) {
				color = originalMaterial.color.clone()
			}

			const material = new THREE.MeshPhysicalMaterial({
				color: color instanceof THREE.Color ? color : 0xffffff,
				roughness,
				metalness,
				clearcoat: 0.1,
				clearcoatRoughness: 0.1,
				// 支持雙面渲染
				side: THREE.DoubleSide,
				// 確保光滑著色
				flatShading: false
			})

			object.material = material
			object.castShadow = true
			object.receiveShadow = true
		}
	}

	/**
	 * 調整燈光強度
	 */
	setKeyLightIntensity(intensity: number): void {
		this.keyLight.intensity = intensity
		this.config.keyLightIntensity = intensity
	}

	setFillLightIntensity(intensity: number): void {
		this.fillLight.intensity = intensity
		this.config.fillLightIntensity = intensity
	}

	setRimLightIntensity(intensity: number): void {
		this.rimLight.intensity = intensity
		this.config.rimLightIntensity = intensity
	}

	/**
	 * 調整色調映射曝光度
	 */
	setTonemappingExposure(exposure: number): void {
		this.renderer.toneMappingExposure = exposure
		this.config.tonemappingExposure = exposure
	}

	/**
	 * 獲取當前 HDRI 環境貼圖
	 */
	getEnvironmentMap(): THREE.Texture | null {
		return this.envMap
	}

	/**
	 * 清理資源
	 */
	dispose(): void {
		this.keyLight.dispose()
		this.fillLight.dispose()
		this.rimLight.dispose()
		this.ambientLight.dispose()

		if (this.envMap) {
			this.envMap.dispose()
		}
	}
}
