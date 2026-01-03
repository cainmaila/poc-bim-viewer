<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import { PostProcessingManager } from '$lib/utils/postProcessingManager'
	import { settingsStore } from '$lib/stores/settings.svelte'
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import { PluginManager, CameraPlugin, FPSControlsPlugin } from '$lib/plugins'

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
	let renderCount = 0
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

	// 初始化Three.js場景
	function initScene() {
		if (!canvasRef) return

		// 創建場景
		scene = new THREE.Scene()
		scene.background = new THREE.Color(0x1a1a1a) // 深灰背景
		scene.fog = new THREE.Fog(0x1a1a1a, 150, 600) // 增加霧效距離

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
		renderer.shadowMap.enabled = true
		renderer.shadowMap.type = THREE.PCFSoftShadowMap

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

		// 添加燈光
		setupLights()

		// 添加網格助手（預設隱藏，由 $effect 控制可見性）
		gridHelper = new THREE.GridHelper(200, 20, 0x4a4a5e, 0x2a2a3e) // 增加尺寸和對比度
		gridHelper.visible = false // 預設隱藏，由 $effect 根據 settingsStore 控制
		gridHelper.position.y = 0 // 確保網格在地面上
		scene.add(gridHelper)

		// 添加軸助手（可選，用於調試）
		// const axesHelper = new THREE.AxesHelper(10)
		// scene.add(axesHelper)

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
		pluginManager.init().then(() => {
			console.log('[BIMViewer] PluginManager initialized')
		})

		// 註冊控制回調
		viewerControlStore.registerGridVisibleCallback((visible: boolean) => {
			if (gridHelper) {
				gridHelper.visible = visible
				requestRender() // 網格可見性變化時請求渲染
				console.log('[BIMViewer] Grid visibility set via control:', visible)
			}
		})

		viewerControlStore.registerBoundingBoxVisibleCallback((visible: boolean) => {
			boundingBoxEnabled = visible
			updateBoundingBox()
			requestRender() // 邊界盒可見性變化時請求渲染
			console.log('[BIMViewer] Bounding box visibility set via control:', visible)
		})
	}

	// 設定燈光（暗色主題 + 暖色照明）
	function setupLights() {
		// 環境光 - 降低強度，使用微暖色調
		const ambientLight = new THREE.AmbientLight(0xffe8d6, 0.35)
		scene.add(ambientLight)

		// 主要方向光 - 暖白色，增強對比
		const directionalLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
		directionalLight.position.set(50, 50, 50)
		directionalLight.castShadow = true
		directionalLight.shadow.camera.left = -50
		directionalLight.shadow.camera.right = 50
		directionalLight.shadow.camera.top = 50
		directionalLight.shadow.camera.bottom = -50
		directionalLight.shadow.mapSize.width = 2048
		directionalLight.shadow.mapSize.height = 2048
		scene.add(directionalLight)

		// 半球光 - 暖色天空 + 冷色地面（互補對比）
		const hemisphereLight = new THREE.HemisphereLight(0xffd699, 0x2a3f5f, 0.5)
		scene.add(hemisphereLight)

		// 填充光 - 減少陰影過暗
		const fillLight = new THREE.DirectionalLight(0x6699ff, 0.3)
		fillLight.position.set(-30, 20, -30)
		scene.add(fillLight)
	}

	// 處理視窗調整大小
	function handleResize() {
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

		// 性能監控（開發環境）
		renderCount++
		if (currentTime - lastFPSLog > FPS_LOG_INTERVAL) {
			const avgFPS = renderCount / ((currentTime - lastFPSLog) / 1000)
			console.log(
				`[BIMViewer] Render Performance: ${avgFPS.toFixed(1)} FPS (${renderCount} renders in ${((currentTime - lastFPSLog) / 1000).toFixed(1)}s)`
			)
			renderCount = 0
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

			// 當模型改變時清除選擇和邊界盒
			currentSelectedObject = null
			if (boundingBoxHelper) {
				scene.remove(boundingBoxHelper)
				boundingBoxHelper.dispose()
				boundingBoxHelper = null
			}
		}

		// 添加新模型
		currentModel.userData.isModel = true

		// 確保所有網格都可以通過名稱搜索，並且存儲了原始材質
		currentModel.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.userData.originalMaterial = child.material
				child.userData.originalOpacity = child.material.opacity
				child.userData.originalTransparent = child.material.transparent
			}
		})

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

		console.log('[BIMViewer] Model added to scene')
	})

	// 效果：監聽 BIM 設定變化並套用可見性覆寫
	$effect(() => {
		const settings = bimSettingsStore.settings
		if (!settings || !scene) return

		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		// 確保追蹤 nodeOverrides 和 updatedAt 的變化
		const overrides = settings.nodeOverrides
		const timestamp = settings.updatedAt

		// 遍歷所有節點套用可見性覆寫
		model.traverse((child) => {
			const path = bimSettingsStore.getPathByUUID(child.uuid)
			if (!path) return

			const override = overrides[path]
			// 如果有覆寫則使用覆寫值，否則預設為可見
			child.visible = override?.visible ?? true
		})

		requestRender() // 可見性變化時請求渲染
		console.log(`[BIMViewer] Applied visibility overrides (updated: ${timestamp})`)
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
