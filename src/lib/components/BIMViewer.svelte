<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { modelStore } from '$lib/stores/modelCache.svelte'

	interface Props {
		modelUrl: string
		autoRotate?: boolean
	}

	let { modelUrl, autoRotate = false }: Props = $props()

	let canvasRef = $state<HTMLCanvasElement | null>(null)
	let scene: THREE.Scene
	let camera: THREE.PerspectiveCamera
	let renderer: THREE.WebGLRenderer
	let controls: OrbitControls
	let animationFrameId: number
	let resizeObserver: ResizeObserver

	// Initialize Three.js scene
	function initScene() {
		if (!canvasRef) return

		// Create scene
		scene = new THREE.Scene()
		scene.background = new THREE.Color(0xf0f0f0)
		scene.fog = new THREE.Fog(0xf0f0f0, 100, 500)

		// Create camera (Perspective, but we'll position it for isometric feel)
		camera = new THREE.PerspectiveCamera(
			45, // Narrower FOV for flatter look
			canvasRef.clientWidth / canvasRef.clientHeight,
			0.1,
			2000
		)
		// Initial 45-degree iso position
		camera.position.set(50, 50, 50)

		// Create renderer
		renderer = new THREE.WebGLRenderer({
			canvas: canvasRef,
			antialias: true,
			alpha: true
		})
		renderer.setSize(canvasRef.clientWidth, canvasRef.clientHeight)
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		renderer.shadowMap.enabled = true
		renderer.shadowMap.type = THREE.PCFSoftShadowMap

		// Create controls
		controls = new OrbitControls(camera, renderer.domElement)
		controls.enableDamping = true
		controls.dampingFactor = 0.05
		controls.autoRotate = autoRotate
		controls.autoRotateSpeed = 0.5
		controls.maxPolarAngle = Math.PI / 2

		// Add lights
		setupLights()

		// Add grid helper
		const gridHelper = new THREE.GridHelper(100, 100, 0xcccccc, 0xe0e0e0)
		scene.add(gridHelper)

		// Add axes helper (optional, for debugging)
		// const axesHelper = new THREE.AxesHelper(10)
		// scene.add(axesHelper)
	}

	// Setup lighting
	function setupLights() {
		// Ambient light for base illumination
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
		scene.add(ambientLight)

		// Main directional light (sun-like)
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

		// Hemisphere light for soft ambient lighting
		const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
		scene.add(hemisphereLight)
	}

	// Handle window resize
	function handleResize() {
		if (!canvasRef || !camera || !renderer) return

		const width = canvasRef.clientWidth
		const height = canvasRef.clientHeight

		camera.aspect = width / height
		camera.updateProjectionMatrix()

		renderer.setSize(width, height)
	}

	// Animation loop
	function animate() {
		animationFrameId = requestAnimationFrame(animate)

		// Update controls
		controls.update()

		// Render the scene
		renderer.render(scene, camera)
	}

	// Effect: Initialize scene when canvas is ready
	$effect(() => {
		if (canvasRef) {
			initScene()
			animate()

			// Setup ResizeObserver
			resizeObserver = new ResizeObserver(() => {
				handleResize()
			})
			resizeObserver.observe(canvasRef)

			// Load model (initial only)
			if (!modelStore.model) {
				modelStore.loadModel(modelUrl)
			}

			// Cleanup
			return () => {
				resizeObserver?.disconnect()
				cancelAnimationFrame(animationFrameId)
				controls?.dispose()
				renderer?.dispose()
			}
		}
	})

	// Effect: Add model to scene when loaded
	$effect(() => {
		if (modelStore.model && scene) {
			// Remove previous model if exists
			const existingModel = scene.children.find((child) => child.userData.isModel)
			if (existingModel) {
				scene.remove(existingModel)
			}

			// Add new model
			const model = modelStore.model
			model.userData.isModel = true

			// Ensure all meshes are searchable by name and have original materials stored
			model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.userData.originalMaterial = child.material
					child.userData.originalOpacity = child.material.opacity
					child.userData.originalTransparent = child.material.transparent
				}
			})

			// Center the model
			const box = new THREE.Box3().setFromObject(model)
			const center = box.getCenter(new THREE.Vector3())
			model.position.sub(center)

			scene.add(model)

			// Initial 45-degree isometric view
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

		// Position camera at 45/45 degree
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

			// Pan camera to the object's center without changing orientation (mostly)
			// For AC-4 "不得被裁切", we adjust distance
			const maxDim = Math.max(size.x, size.y, size.z)
			const distance = Math.max(maxDim * 3, 5)

			const direction = new THREE.Vector3().copy(camera.position).sub(controls.target).normalize()

			const newPos = new THREE.Vector3().copy(center).add(direction.multiplyScalar(distance))

			// Simple fly animation or immediate move
			camera.position.copy(newPos)
			controls.target.copy(center)
			controls.update()
		}
	}

	function applyXray(target: THREE.Object3D) {
		const model = scene.children.find((child) => child.userData.isModel)
		if (!model) return

		model.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				if (child === target || isDescendant(target, child)) {
					// Highlight
					child.material = child.userData.originalMaterial
				} else {
					// X-ray
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
