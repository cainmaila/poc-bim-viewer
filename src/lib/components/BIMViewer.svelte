<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { modelStore } from '$lib/stores/modelCache.svelte'

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
	let resizeObserver: ResizeObserver

	// 初始化Three.js場景
	function initScene() {
		if (!canvasRef) return

		// 創建場景
		scene = new THREE.Scene()
		scene.background = new THREE.Color(0xf0f0f0)
		scene.fog = new THREE.Fog(0xf0f0f0, 100, 500)

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

		// 添加網格助手
		const gridHelper = new THREE.GridHelper(100, 100, 0xcccccc, 0xe0e0e0)
		scene.add(gridHelper)

		// 添加軸助手（可選，用於調試）
		// const axesHelper = new THREE.AxesHelper(10)
		// scene.add(axesHelper)
	}

	// 設定燈光
	function setupLights() {
		// 環境光用於基礎照明
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
		scene.add(ambientLight)

		// 主要方向光（類似太陽）
		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
		directionalLight.position.set(50, 50, 50)
		directionalLight.castShadow = true
		directionalLight.shadow.camera.left = -50
		directionalLight.shadow.camera.right = 50
		directionalLight.shadow.camera.top = 50
		directionalLight.shadow.camera.bottom = -50
		directionalLight.shadow.mapSize.width = 2048
		directionalLight.shadow.mapSize.height = 2048
		scene.add(directionalLight)

		// 半球光用於柔和環境照明
		const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
		scene.add(hemisphereLight)
	}

	// 處理視窗調整大小
	function handleResize() {
		if (!canvasRef || !camera || !renderer) return

		const width = canvasRef.clientWidth
		const height = canvasRef.clientHeight

		camera.aspect = width / height
		camera.updateProjectionMatrix()

		renderer.setSize(width, height)
	}

	// 動畫循環
	function animate() {
		animationFrameId = requestAnimationFrame(animate)

		// 更新控制項
		controls.update()

		// 渲染場景
		renderer.render(scene, camera)
	}

	// 效果：當canvas準備好時初始化場景
	$effect(() => {
		if (canvasRef) {
			initScene()
			animate()

			// 設定ResizeObserver
			resizeObserver = new ResizeObserver(() => {
				handleResize()
			})
			resizeObserver.observe(canvasRef)

			// 清理
			return () => {
				resizeObserver?.disconnect()
				cancelAnimationFrame(animationFrameId)
				controls?.dispose()
				renderer?.dispose()
			}
		}
	})

	// 效果：當模型載入時添加到場景
	$effect(() => {
		if (modelStore.model && scene) {
			// 如果存在舊模型則移除
			const existingModel = scene.children.find((child) => child.userData.isModel)
			if (existingModel) {
				scene.remove(existingModel)
			}

			// 添加新模型
			const model = modelStore.model
			model.userData.isModel = true

			// 確保所有網格都可以通過名稱搜索，並且存儲了原始材質
			model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.userData.originalMaterial = child.material
					child.userData.originalOpacity = child.material.opacity
					child.userData.originalTransparent = child.material.transparent
				}
			})

			// 居中模型
			const box = new THREE.Box3().setFromObject(model)
			const center = box.getCenter(new THREE.Vector3())
			model.position.sub(center)

			scene.add(model)

			// 初始45度等距視圖
			resetCameraView()

			console.log('[BIMViewer] Model added to scene')
		}
	})

	function resetCameraView() {
		if (!scene || !camera || !controls) return

		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		const box = new THREE.Box3().setFromObject(model)
		const size = box.getSize(new THREE.Vector3())
		const maxDim = Math.max(size.x, size.y, size.z)
		const distance = maxDim * 2.5

		// 將相機定位在45/45度
		camera.position.set(distance, distance, distance)
		controls.target.set(0, 0, 0)
		camera.lookAt(0, 0, 0)
		controls.update()
	}

	/**
	 * Fly to a specific object by name or UUID
	 */
	export function flyTo(objectName: string) {
		if (!scene || !camera || !controls) return

		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		let target: THREE.Object3D | undefined
		model.traverse((child) => {
			if (child.name === objectName || child.uuid === objectName) {
				target = child
			}
		})

		if (target) {
			applyXray(target)

			const box = new THREE.Box3().setFromObject(target)
			const center = box.getCenter(new THREE.Vector3())
			const size = box.getSize(new THREE.Vector3())

			const maxDim = Math.max(size.x, size.y, size.z)
			const distance = Math.max(maxDim * 3, 5)

			const direction = new THREE.Vector3().copy(camera.position).sub(controls.target).normalize()

			const targetPos = new THREE.Vector3().copy(center).add(direction.multiplyScalar(distance))
			const targetLookAt = center.clone()

			// 動畫相機移動
			animateCameraTo(targetPos, targetLookAt)
		}
	}

	/**
	 * Animate camera to target position with easing
	 */
	function animateCameraTo(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3) {
		const startPos = camera.position.clone()
		const startLookAt = controls.target.clone()
		const duration = 1200 // 1.2秒
		const startTime = performance.now()

		function animate() {
			const elapsed = performance.now() - startTime
			const progress = Math.min(elapsed / duration, 1)

			// 緩入緩出立方
			const eased =
				progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

			// 插值位置和注視目標
			camera.position.lerpVectors(startPos, targetPos, eased)
			controls.target.lerpVectors(startLookAt, targetLookAt, eased)
			controls.update()

			if (progress < 1) {
				requestAnimationFrame(animate)
			}
		}

		animate()
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

<canvas bind:this={canvasRef} class="viewer-canvas"></canvas>

<style lang="postcss">
	.viewer-canvas {
		width: 100%;
		height: 100%;
		display: block;
		outline: none;
	}
</style>
