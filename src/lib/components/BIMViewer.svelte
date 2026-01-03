<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { PostProcessingManager } from '$lib/utils/postProcessingManager'
	import { settingsStore } from '$lib/stores/settings.svelte'
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

	// WASD 鍵盤平移控制（使用鍵盤碼，不受大小寫影響）
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	let keysPressed = new Map<string, boolean>([
		['KeyW', false],
		['KeyA', false],
		['KeyS', false],
		['KeyD', false]
	])

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

		// 添加燈光
		setupLights()

		// 添加網格助手（預設隱藏，避免響應式追蹤）
		gridHelper = new THREE.GridHelper(100, 100, 0x3f3f46, 0x2a2a2e) // 暗色網格
		gridHelper.visible = false // 預設隱藏，由 setGridVisible 控制
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

	// 動畫循環
	let lastTime = performance.now()
	function animate() {
		animationFrameId = requestAnimationFrame(animate)

		// 計算 deltaTime
		const currentTime = performance.now()
		const deltaTime = (currentTime - lastTime) / 1000 // 轉換為秒
		lastTime = currentTime

		// 更新 WASD 平移
		updatePanMovement()

		// 更新控制項（FPS 模式時跳過，讓 PointerLockControls 控制相機）
		const fpsPlugin = pluginManager?.getPlugin<FPSControlsPlugin>('fpsControls')
		if (!fpsPlugin?.isEnabled()) {
			controls.update()
		}

		// 更新所有 Plugin
		if (pluginManager) {
			pluginManager.update(deltaTime)
		}

		// 渲染場景（使用後期處理或直接渲染）
		if (postProcessingManager) {
			postProcessingManager.render()
		} else {
			renderer.render(scene, camera)
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
	$effect(() => {
		const currentModel = modelStore.model
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

		console.log('[BIMViewer] Model added to scene')
	})

	// 移除：不再需要監聽設置變化（切換效果會自動重新整理頁面）

	function resetCameraView() {
		const cameraPlugin = pluginManager?.getPlugin<CameraPlugin>('camera')
		cameraPlugin?.resetCameraView()
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
	}

	export function setGridVisible(visible: boolean) {
		if (gridHelper) {
			gridHelper.visible = visible
		}
	}

	/**
	 * 切換邊界盒可見性
	 */
	export function setBoundingBoxVisible(visible: boolean) {
		boundingBoxEnabled = visible
		updateBoundingBox()
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
