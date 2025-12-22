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

	// Initialize Three.js scene
	function initScene() {
		if (!canvasRef) return

		// Create scene
		scene = new THREE.Scene()
		scene.background = new THREE.Color(0xf0f0f0)
		scene.fog = new THREE.Fog(0xf0f0f0, 100, 500)

		// Create camera
		camera = new THREE.PerspectiveCamera(
			60,
			canvasRef.clientWidth / canvasRef.clientHeight,
			0.1,
			1000
		)
		camera.position.set(20, 20, 20)

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

			// Add resize listener
			window.addEventListener('resize', handleResize)

			// Load model
			modelStore.loadModel(modelUrl)

			// Cleanup
			return () => {
				window.removeEventListener('resize', handleResize)
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

			// Center the model
			const box = new THREE.Box3().setFromObject(model)
			const center = box.getCenter(new THREE.Vector3())
			model.position.sub(center)

			// Scale the model to fit in view
			const size = box.getSize(new THREE.Vector3())
			const maxDim = Math.max(size.x, size.y, size.z)
			const scale = 10 / maxDim // Target size of 10 units
			model.scale.setScalar(scale)

			scene.add(model)

			// Adjust camera position based on model size
			const distance = maxDim * 2
			camera.position.set(distance, distance * 0.7, distance)
			camera.lookAt(0, 0, 0)

			console.log('[BIMViewer] Model added to scene')
		}
	})
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
