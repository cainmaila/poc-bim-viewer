<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	// @ts-expect-error - three-viewport-gizmo 沒有型別定義，但運行時正常工作
	import { ViewportGizmo } from 'three-viewport-gizmo'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import { PostProcessingManager } from '$lib/utils/postProcessingManager'
	import { settingsStore } from '$lib/stores/settings.svelte'
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import { PluginManager, CameraPlugin, FPSControlsPlugin } from '$lib/plugins'
	import { CinematicLightingManager } from '$lib/utils/cinematicLightingManager'
	import { base } from '$app/paths'

	interface Props {
		autoRotate?: boolean
	}

	let { autoRotate = false }: Props = $props()

	let canvasRef = $state<HTMLCanvasElement | null>(null)
	let scene: THREE.Scene
	let camera: THREE.PerspectiveCamera
	let renderer: THREE.WebGLRenderer
	let controls: OrbitControls
	let animationFrameId: number
	let gridHelper: THREE.GridHelper
	let postProcessingManager: PostProcessingManager | null = null
	let pluginManager: PluginManager
	let cinematicLightingManager: CinematicLightingManager | null = null
	let viewportGizmo: ViewportGizmo | null = null

	// 邊界盒狀態
	let currentSelectedObject: THREE.Object3D | null = null
	let boundingBoxHelper: THREE.BoxHelper | null = null
	let boundingBoxEnabled = $state(false)

	// 容器引用
	let containerRef = $state<HTMLDivElement | null>(null)

	// 按需渲染狀態
	let renderRequested = false
	let continuousRenderActive = false

	// 性能監控（僅在開發環境啟用）
	let lastFPSLog = performance.now()
	const FPS_LOG_INTERVAL = 5000 // 每 5 秒記錄一次統計

	// 使用 $derived 隔離 model 依賴，避免 store 其他屬性變化時觸發重新渲染
	const currentModel = $derived(modelStore.model)

	/**
	 * WASD 鍵盤狀態追蹤
	 *
	 * @non-reactive - 刻意設計為非響應式以達到最佳性能
	 *
	 * 原因：
	 * 1. 每秒更新 60 次（在 animate loop 中讀取）
	 * 2. 如果設為響應式，每次按鍵都會觸發 Svelte 的 reactivity system
	 * 3. 這會造成不必要的重新渲染和性能開銷
	 *
	 * 限制：
	 * - 如果未來需要在 UI 中顯示按鍵狀態，需重構為響應式
	 * - 目前僅用於內部計算，無需響應式追蹤
	 *
	 * 使用鍵盤碼（KeyW/KeyA/KeyS/KeyD）而非字符，不受大小寫和鍵盤佈局影響
	 */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	let keysPressed = new Map<string, boolean>([
		['KeyW', false],
		['KeyA', false],
		['KeyS', false],
		['KeyD', false]
	])

	/**
	 * 請求單次渲染（按需渲染）
	 * 如果已請求或正在持續渲染，則不重複請求
	 */
	function requestRender() {
		if (!renderRequested && !continuousRenderActive) {
			renderRequested = true
		}
	}

	/**
	 * 檢查是否需要持續渲染
	 * @returns true 如果需要持續渲染（動畫、交互等）
	 */
	function checkNeedsContinuousRender(): boolean {
		// 1. 檢查 OrbitControls 交互（滑鼠拖曳、縮放等）
		if (continuousRenderActive) return true

		// 2. 檢查 autoRotate
		if (controls?.autoRotate) return true

		// 3. 檢查 WASD 移動
		if (
			keysPressed.get('KeyW') ||
			keysPressed.get('KeyA') ||
			keysPressed.get('KeyS') ||
			keysPressed.get('KeyD')
		) {
			return true
		}

		// 4. 檢查 FPS 模式
		const fpsPlugin = pluginManager?.getPlugin<FPSControlsPlugin>('fpsControls')
		if (fpsPlugin?.isEnabled()) return true

		// 5. 檢查 CameraPlugin 動畫
		const cameraPlugin = pluginManager?.getPlugin<CameraPlugin>('camera')
		if (cameraPlugin?.isAnimating()) return true

		return false
	}

	/**
	 * 設置預設燈光系統（簡單的三光源）
	 */
	function setupDefaultLighting(scene: THREE.Scene) {
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

	// 初始化Three.js場景
	function initScene() {
		if (!canvasRef) return

		// 創建場景
		scene = new THREE.Scene()
		scene.background = new THREE.Color(0x1a1a1a) // 深灰背景
		// 調整霧效以增強遠近亮度差異（大氣透視）
		// 使用深藍色霧氣模擬傍晚/夕陽時的大氣感，並拉近霧的起始距離
		scene.fog = new THREE.Fog(0x1a1a2e, 50, 400)

		// 創建相機（透視，但我們將定位為等距感覺）
		camera = new THREE.PerspectiveCamera(
			45, // 較窄的FOV以獲得更平坦的外觀
			canvasRef.clientWidth / canvasRef.clientHeight,
			0.1,
			2000
		)
		// 初始45度等距位置
		camera.position.set(50, 50, 50)

		// 創建渲染器
		renderer = new THREE.WebGLRenderer({
			canvas: canvasRef,
			antialias: true,
			alpha: true
		})
		renderer.setSize(canvasRef.clientWidth, canvasRef.clientHeight)
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

		// 創建控制項
		controls = new OrbitControls(camera, renderer.domElement)
		controls.enableDamping = true
		controls.dampingFactor = 0.05
		controls.autoRotate = autoRotate
		controls.autoRotateSpeed = 0.5
		controls.maxPolarAngle = Math.PI / 2

		// 監聽 OrbitControls 事件以實現按需渲染
		controls.addEventListener('change', requestRender)
		controls.addEventListener('start', () => {
			continuousRenderActive = true
		})
		controls.addEventListener('end', () => {
			continuousRenderActive = false
			requestRender() // 最後渲染一次確保最終狀態
		})

		// 根據設置初始化燈光系統
		if (settingsStore.cinematicLighting) {
			// 初始化電影級燈光管理器
			cinematicLightingManager = new CinematicLightingManager(scene, camera, renderer, {
				keyLightIntensity: 2.0, // 強烈的夕陽主光
				keyLightColor: '#ff9900', // 深橙色夕陽光
				fillLightIntensity: 0.2, // 降低填充光，增加明暗對比
				fillLightColor: '#001133', // 深藍色陰影，與夕陽形成強烈冷暖對比
				rimLightIntensity: 2.0, // 強烈的邊緣光，勾勒輪廓
				rimLightColor: '#ffd700', // 金色邊緣光，呼應夕陽
				ambientIntensity: 0.05, // 極低的環境光，依賴主光和填充光
				ambientColor: '#ffffff',
				environmentIntensity: 0.2,
				backgroundIntensity: 0.1,
				tonemappingExposure: 0.35,
				toneMappingType: THREE.ACESFilmicToneMapping,
				shadowMapType: THREE.PCFSoftShadowMap,
				shadowMapSize: 2048,
				shadowBias: -0.0001,
				followCamera: true,
				cameraFollowDistance: 100, // 增加距離，模擬遠處太陽
				cameraFollowHeight: 30 // 降低基礎高度，配合管理器中的係數模擬低角度
			})

			// 加載 HDRI 環境貼圖
			const hdriPath = `${base}/dancing_hall_1k.hdr`
			cinematicLightingManager.loadHDRIEnvironment(hdriPath).catch((err) => {
				console.warn('HDRI 環境貼圖加載失敗:', err)
				// 即使 HDRI 加載失敗也繼續運行，使用基本照明
			})
		} else {
			// 使用預設燈光（簡單的三光源系統）
			setupDefaultLighting(scene)
		}

		// 添加網格助手（預設隱藏，由 $effect 控制可見性）
		gridHelper = new THREE.GridHelper(200, 20, 0x4a4a5e, 0x2a2a3e) // 增加尺寸和對比度
		gridHelper.visible = false // 預設隱藏，由 $effect 根據 settingsStore 控制
		gridHelper.position.y = 0 // 確保網格在地面上
		scene.add(gridHelper)

		// 添加軸助手（可選，用於調試）
		// const axesHelper = new THREE.AxesHelper(10)
		// scene.add(axesHelper)

		// 初始化 ViewportGizmo（右下角 3D 坐標軸指示器）
		viewportGizmo = new ViewportGizmo(camera, renderer, {
			placement: 'bottom-right',
			size: 128,
			lineWidth: 2.5,
			offset: { right: 20, bottom: 20 }
		})
		viewportGizmo.attachControls(controls)

		// 監聽 ViewportGizmo 的事件以實現按需渲染
		// @ts-expect-error - ViewportGizmo 事件系統
		viewportGizmo.addEventListener('start', () => {
			continuousRenderActive = true
		})
		// @ts-expect-error - ViewportGizmo 事件系統
		viewportGizmo.addEventListener('end', () => {
			continuousRenderActive = false
			requestRender()
		})
		// @ts-expect-error - ViewportGizmo 事件系統
		viewportGizmo.addEventListener('change', requestRender)

		// 初始化後期處理管理器（從 settingsStore 讀取配置）
		const config = settingsStore.postProcessing
		postProcessingManager = new PostProcessingManager(scene, camera, renderer, config)

		// 初始化 PluginManager
		pluginManager = new PluginManager({
			scene,
			camera,
			renderer,
			controls,
			canvas: canvasRef
		})

		// 註冊 Plugin
		pluginManager.register('camera', new CameraPlugin())
		pluginManager.register('fpsControls', new FPSControlsPlugin())

		// 初始化所有 Plugin
		pluginManager.init()

		// 註冊控制回調
		viewerControlStore.registerGridVisibleCallback((visible: boolean) => {
			if (gridHelper) {
				gridHelper.visible = visible
				requestRender() // 網格可見性變化時請求渲染
			}
		})

		viewerControlStore.registerBoundingBoxVisibleCallback((visible: boolean) => {
			boundingBoxEnabled = visible
			updateBoundingBox()
			requestRender() // 邊界盒可見性變化時請求渲染
		})
	}

	// 處理視窗調整大小
	function handleResize() {
		if (viewportGizmo) {
			viewportGizmo.update()
		}
		if (!containerRef || !camera || !renderer) return

		const width = containerRef.clientWidth
		const height = containerRef.clientHeight

		camera.aspect = width / height
		camera.updateProjectionMatrix()

		renderer.setSize(width, height)

		// 同步更新後期處理解析度
		if (postProcessingManager) {
			postProcessingManager.handleResize(width, height)
		}

		// 調整大小後請求重新渲染
		requestRender()
	}

	// 使用 requestAnimationFrame 節流 resize 處理
	let resizeScheduled = false
	function scheduleResize() {
		if (resizeScheduled) return
		resizeScheduled = true

		requestAnimationFrame(() => {
			handleResize()
			resizeScheduled = false
		})
	}

	// 使用 $effect 設置 ResizeObserver
	$effect(() => {
		if (!containerRef) return

		const observer = new ResizeObserver(() => {
			scheduleResize()
		})

		observer.observe(containerRef)

		return () => {
			observer.disconnect()
		}
	})

	// 註冊 onMount 效果
	$effect(() => {
		if (!canvasRef) return
	})

	// WASD 鍵盤事件處理
	function handleKeyDown(e: KeyboardEvent) {
		if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
			e.preventDefault() // 防止頁面滾動
			keysPressed.set(e.code, true)
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
			keysPressed.set(e.code, false)
		}
	}

	// 更新 WASD 平移移動
	function updatePanMovement() {
		if (!scene || !camera || !controls) return

		// 檢查 FPS 模式是否啟用（FPS Plugin 接管 WASD）
		const fpsPlugin = pluginManager?.getPlugin<FPSControlsPlugin>('fpsControls')
		if (fpsPlugin?.isEnabled()) {
			return // FPS Plugin 接管 WASD
		}

		// 計算攝影機視線方向
		const forward = new THREE.Vector3().copy(controls.target).sub(camera.position).normalize()

		// 投影到水平面（去掉 Y 分量，保持在當前高度移動）
		const forwardFlat = new THREE.Vector3(forward.x, 0, forward.z).normalize()

		// 計算水平面上的右向量
		const right = new THREE.Vector3()
			.crossVectors(forwardFlat, new THREE.Vector3(0, 1, 0))
			.normalize()

		// 合成移動方向（只在水平面上移動）
		const moveDirection = new THREE.Vector3()
		if (keysPressed.get('KeyW')) moveDirection.add(forwardFlat) // 向前（水平面）
		if (keysPressed.get('KeyS')) moveDirection.sub(forwardFlat) // 向後（水平面）
		if (keysPressed.get('KeyD')) moveDirection.add(right) // 向右（水平面）
		if (keysPressed.get('KeyA')) moveDirection.sub(right) // 向左（水平面）

		// 執行平移
		if (moveDirection.length() > 0) {
			const moveSpeed = 0.2
			const offset = moveDirection.normalize().multiplyScalar(moveSpeed)

			camera.position.add(offset)
			controls.target.add(offset)
		}
	}

	// 智能渲染循環 - 按需渲染以降低耗電
	let lastTime = performance.now()
	let frameCount = 0
	function animate() {
		animationFrameId = requestAnimationFrame(animate)

		// 計算 deltaTime
		const currentTime = performance.now()
		const deltaTime = (currentTime - lastTime) / 1000 // 轉換為秒
		lastTime = currentTime
		frameCount++

		// 檢查是否需要持續渲染（動畫、WASD、FPS 等）
		const needsContinuousRender = checkNeedsContinuousRender()

		// 如果不需要渲染且沒有請求，則跳過本幀
		if (!needsContinuousRender && !renderRequested) {
			return
		}

		// 清除單次渲染請求標記
		renderRequested = false

		// 更新 WASD 平移（僅在有按鍵時執行）
		if (
			keysPressed.get('KeyW') ||
			keysPressed.get('KeyA') ||
			keysPressed.get('KeyS') ||
			keysPressed.get('KeyD')
		) {
			updatePanMovement()
		}

		// 更新控制項（30fps - 每 2 幀執行一次，減少計算開銷）
		// FPS 模式時跳過，讓 PointerLockControls 控制相機
		const fpsPlugin = pluginManager?.getPlugin<FPSControlsPlugin>('fpsControls')
		if (!fpsPlugin?.isEnabled() && frameCount % 2 === 0) {
			controls.update()
		}

		// 更新電影級燈光跟隨攝影機
		if (cinematicLightingManager) {
			cinematicLightingManager.updateLightsFollowCamera()
		}

		// 更新所有 Plugin（每幀執行）
		if (pluginManager) {
			pluginManager.update(deltaTime)
		}

		// 渲染場景
		if (postProcessingManager) {
			postProcessingManager.render()
		} else {
			renderer.render(scene, camera)
		}

		// 只在需要時渲染 ViewportGizmo（不能在每幀都渲染，會導致卡頓）
		// ViewportGizmo 會在交互時自動通過事件觸發重新渲染
		if (viewportGizmo) {
			viewportGizmo.render()
		}

		// 性能監控（開發環境）
		if (currentTime - lastFPSLog > FPS_LOG_INTERVAL) {
			lastFPSLog = currentTime
		}
	}

	// 效果：當canvas準備好時初始化場景
	$effect(() => {
		if (canvasRef) {
			initScene()
			animate()

			// 添加鍵盤事件監聽器
			window.addEventListener('keydown', handleKeyDown)
			window.addEventListener('keyup', handleKeyUp)

			// 清理
			return () => {
				cancelAnimationFrame(animationFrameId)
				controls?.dispose()
				renderer?.dispose()
				pluginManager?.dispose()

				// 清理電影級燈光管理器
				if (cinematicLightingManager) {
					cinematicLightingManager.dispose()
					cinematicLightingManager = null
				}

				// 清理邊界盒輔助工具
				if (boundingBoxHelper) {
					scene.remove(boundingBoxHelper)
					boundingBoxHelper.dispose()
					boundingBoxHelper = null
				}

				// 清理後期處理管理器
				if (postProcessingManager) {
					postProcessingManager.dispose()
					postProcessingManager = null
				}
				// 清理 ViewportGizmo
				if (viewportGizmo) {
					viewportGizmo.detachControls()
					viewportGizmo.dispose()
					viewportGizmo = null
				}
				// 移除鍵盤事件監聽器
				window.removeEventListener('keydown', handleKeyDown)
				window.removeEventListener('keyup', handleKeyUp)
				keysPressed.clear()
			}
		}
	})

	// 追蹤已渲染的模型，避免重複渲染
	let renderedModel: THREE.Group | null = null

	// 效果：當模型載入時添加到場景
	// 使用 $derived 的 currentModel 確保只在 model 真正改變時執行
	$effect(() => {
		if (!currentModel || !scene) return

		// 如果是同一個模型，不重複渲染
		if (currentModel === renderedModel) return

		// 如果存在舊模型則移除
		const existingModel = scene.children.find((child) => child.userData.isModel)
		if (existingModel) {
			scene.remove(existingModel)

			// 當模型改變時清除選擇（使用統一接口）
			clearSelection()
		}

		// 添加新模型
		currentModel.userData.isModel = true

		// 確保所有網格都可以通過名稱搜索，並且存儲了原始材質
		currentModel.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.userData.originalMaterial = child.material
				child.userData.originalOpacity = child.material.opacity
				child.userData.originalTransparent = child.material.transparent

				// 確保法線被正確計算（修復小三角形問題）
				if (child.geometry) {
					child.geometry.computeVertexNormals()
					child.geometry.computeBoundingBox()
				}

				// 啟用陰影投射和接收（電影級燈光需要）
				child.castShadow = true
				child.receiveShadow = true

				// 確保材質支持雙面渲染（防止背面隱藏）
				if (child.material instanceof THREE.Material) {
					child.material.side = THREE.DoubleSide
					child.material.needsUpdate = true
				}
			}
		})

		// 應用電影級材質更新
		if (cinematicLightingManager) {
			cinematicLightingManager.updateMaterialsForCinematic()
		}

		// 居中模型
		const box = new THREE.Box3().setFromObject(currentModel)
		const center = box.getCenter(new THREE.Vector3())
		currentModel.position.sub(center)

		scene.add(currentModel)

		// 記錄已渲染的模型
		renderedModel = currentModel

		// 初始45度等距視圖
		resetCameraView()

		requestRender() // 模型載入後請求渲染
	})

	// 效果：監聽 BIM 設定變化並套用可見性覆寫
	$effect(() => {
		const settings = bimSettingsStore.settings
		if (!settings || !scene) return

		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		// 確保追蹤 nodeOverrides 的變化
		const overrides = settings.nodeOverrides

		// 遍歷所有節點套用可見性覆寫
		model.traverse((child) => {
			const path = bimSettingsStore.getPathByUUID(child.uuid)
			if (!path) return

			const override = overrides[path]
			// 如果有覆寫則使用覆寫值，否則預設為可見
			child.visible = override?.visible ?? true
		})

		requestRender() // 可見性變化時請求渲染
	})

	// 移除：不再需要監聽設置變化（切換效果會自動重新整理頁面）

	function resetCameraView() {
		const cameraPlugin = pluginManager?.getPlugin<CameraPlugin>('camera')
		cameraPlugin?.resetCameraView()
		requestRender() // 相機重置後請求渲染
	}

	/**
	 * Fly to a specific object by name or UUID
	 */
	export function flyTo(objectName: string) {
		if (!scene) return

		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		let target: THREE.Object3D | undefined
		model.traverse((child) => {
			if (child.name === objectName || child.uuid === objectName) {
				target = child
			}
		})

		if (target) {
			// 追蹤當前選中的物件
			currentSelectedObject = target

			// 更新選中節點狀態
			viewerControlStore.setSelectedNode(objectName)

			applyXray(target)
			updateBoundingBox()

			// 更新 Outline 目標
			if (postProcessingManager) {
				postProcessingManager.setOutlineObjects([target])
			}

			// 使用 CameraPlugin 飛向目標
			const cameraPlugin = pluginManager?.getPlugin<CameraPlugin>('camera')
			cameraPlugin?.flyToObject(target)
		}
	}

	/**
	 * Get EventBus for external event listening
	 */
	export function getEventBus() {
		return pluginManager?.getEventBus()
	}

	/**
	 * Request a render (exported for external use, e.g., plugins)
	 */
	export { requestRender }

	function applyXray(target: THREE.Object3D) {
		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		model.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				if (child === target || isDescendant(target, child)) {
					// 高亮
					child.material = child.userData.originalMaterial
				} else {
					// X射線
					const xrayMaterial = child.userData.originalMaterial.clone()
					xrayMaterial.transparent = true
					xrayMaterial.opacity = 0.1
					child.material = xrayMaterial
				}
			}
		})
		requestRender() // X射線效果變化時請求渲染
	}

	/**
	 * 重置 X-Ray 視覺效果
	 * @internal 內部使用，僅處理視覺效果，不清除共享狀態
	 * @see clearSelection - 外部調用請使用此方法
	 */
	export function resetXray() {
		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		model.traverse((child) => {
			if (child instanceof THREE.Mesh && child.userData.originalMaterial) {
				child.material = child.userData.originalMaterial
			}
		})

		// 清除選擇和邊界盒
		currentSelectedObject = null
		updateBoundingBox()

		// 清除 Outline 目標
		if (postProcessingManager) {
			postProcessingManager.clearOutlineObjects()
		}

		requestRender() // 重置 X射線時請求渲染
	}

	/**
	 * 清除選取狀態（統一接口）
	 * 同時清除視覺效果和共享狀態
	 */
	export function clearSelection() {
		// 防禦性檢查
		if (!scene) return

		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		// 如果沒有選取則直接返回
		if (!currentSelectedObject && !viewerControlStore.selectedNodeId) {
			return
		}

		// 清除視覺效果
		resetXray()

		// 清除共享狀態
		viewerControlStore.clearSelectedNode()
	}

	/**
	 * 根據當前狀態更新或隱藏邊界盒
	 * 重用同一個 BoxHelper 實例以提高效率
	 */
	function updateBoundingBox() {
		if (!scene) return

		// 如果邊界盒已啟用且有物件被選中
		if (boundingBoxEnabled && currentSelectedObject) {
			if (boundingBoxHelper) {
				// 更新現有的 helper 指向新物件
				boundingBoxHelper.setFromObject(currentSelectedObject)
			} else {
				// 創建新的 BoxHelper（綠色）
				boundingBoxHelper = new THREE.BoxHelper(currentSelectedObject, 0x00ff00)
				scene.add(boundingBoxHelper)
			}
			boundingBoxHelper.visible = true
		} else {
			// 如果存在邊界盒則隱藏它
			if (boundingBoxHelper) {
				boundingBoxHelper.visible = false
			}
		}
		requestRender() // 邊界盒狀態變化時請求渲染
	}

	function isDescendant(parent: THREE.Object3D, child: THREE.Object3D): boolean {
		let node = child.parent
		while (node) {
			if (node === parent) return true
			node = node.parent
		}
		return false
	}
</script>

<div class="h-full w-full" bind:this={containerRef}>
	<canvas
		bind:this={canvasRef}
		class="block h-full w-full touch-none"
		aria-label="3D BIM Model Viewer"
	></canvas>
</div>

<style lang="postcss">
	/* 保留 Three.js 必要樣式 */
	canvas {
		outline: none;
	}
</style>
