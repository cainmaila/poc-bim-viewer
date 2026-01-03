import * as THREE from 'three'
import { BasePlugin } from '../core/IPlugin'
import { calculateOptimalDistance, selectViewDirection } from '$lib/utils/cameraUtils'
import type { CameraAnimationOptions, ViewDirection } from './types'
import { settingsStore } from '$lib/stores/settings.svelte'

/**
 * CameraPlugin - 相機控制 Plugin
 * 提供相機動畫、視角控制和相機操作功能
 */
export class CameraPlugin extends BasePlugin {
	readonly name = 'camera'

	// 動畫狀態
	private currentAnimation: {
		id: number
		startTime: number
		duration: number
		startPos: THREE.Vector3
		startTarget: THREE.Vector3
		targetPos: THREE.Vector3
		targetLookAt: THREE.Vector3
		onComplete?: () => void
	} | null = null

	// 配置
	private readonly CAMERA_PADDING = 0.15
	private readonly DEFAULT_ANIMATION_DURATION = 1200

	// Ray-based 縮放配置
	private readonly MIN_DISTANCE_TO_TARGET = 0.5
	private readonly ZOOM_SPEED = 0.002
	private raycaster = new THREE.Raycaster()
	private rayBasedZoomEnabled = true

	// 事件監聽器引用（用於清理）
	private controlsChangeHandler?: () => void
	private wheelHandler?: (event: WheelEvent) => void

	protected async onInit(): Promise<void> {
		console.log('[CameraPlugin] Initialized')

		// 讀取初始設定
		this.rayBasedZoomEnabled = settingsStore.rayBasedZoom

		// 設定滾輪監聽
		this.setupWheelListener()

		// 監聽 controls 變化以發送事件
		this.setupControlsListener()
	}

	/**
	 * 飛向指定目標（名稱或 UUID）
	 */
	async flyTo(objectName: string, options?: CameraAnimationOptions): Promise<void> {
		const model = this.findModel()
		if (!model) {
			console.warn('[CameraPlugin] No model in scene')
			return
		}

		const target = this.findObject(model, objectName)
		if (!target) {
			console.warn(`[CameraPlugin] Object not found: ${objectName}`)
			return
		}

		return this.flyToObject(target, options)
	}

	/**
	 * 飛向 Three.js 對象
	 */
	async flyToObject(target: THREE.Object3D, options?: CameraAnimationOptions): Promise<void> {
		const box = new THREE.Box3().setFromObject(target)
		const center = box.getCenter(new THREE.Vector3())

		// 獲取當前視角方向
		const currentDirection = new THREE.Vector3()
			.copy(this.context.camera.position)
			.sub(this.context.controls.target)
			.normalize()

		// 選擇最佳視角
		const viewDirection = selectViewDirection(currentDirection, box)

		// 計算最佳距離
		const distance = calculateOptimalDistance(
			box,
			this.context.camera,
			viewDirection,
			options?.padding ?? this.CAMERA_PADDING
		)

		// 計算目標相機位置
		const targetPos = center.clone().add(viewDirection.clone().multiplyScalar(distance))

		// 發送事件
		this.emit('object:selected', { object: target, id: target.uuid })

		// 執行動畫
		return this.animateCameraTo(targetPos, center, {
			duration: options?.duration ?? this.DEFAULT_ANIMATION_DURATION,
			onComplete: options?.onComplete
		})
	}

	/**
	 * 重置相機視角
	 */
	resetCameraView(direction?: ViewDirection): void {
		const model = this.findModel()
		if (!model) return

		const box = new THREE.Box3().setFromObject(model)

		// 根據方向選擇視角
		let viewDirection: THREE.Vector3

		switch (direction) {
			case 'top':
				viewDirection = new THREE.Vector3(0, 1, 0)
				break
			case 'front':
				viewDirection = new THREE.Vector3(0, 0, 1)
				break
			case 'side':
				viewDirection = new THREE.Vector3(1, 0, 0)
				break
			case 'isometric':
			default:
				viewDirection = new THREE.Vector3(1, 1, 1).normalize()
		}

		// 計算最佳距離
		const distance = calculateOptimalDistance(
			box,
			this.context.camera,
			viewDirection,
			this.CAMERA_PADDING
		)

		// 設置相機位置
		this.context.camera.position.copy(viewDirection.multiplyScalar(distance))
		this.context.controls.target.set(0, 0, 0)
		this.context.camera.lookAt(0, 0, 0)
		this.context.controls.update()

		// 發送事件
		this.emit('camera:resetView', { direction })
		this.emit('camera:viewChanged', {
			position: this.context.camera.position.clone(),
			target: this.context.controls.target.clone()
		})
	}

	/**
	 * 通用相機動畫
	 */
	animateCameraTo(
		targetPos: THREE.Vector3,
		targetLookAt: THREE.Vector3,
		options?: CameraAnimationOptions
	): Promise<void> {
		return new Promise((resolve) => {
			// 取消當前動畫
			if (this.currentAnimation) {
				cancelAnimationFrame(this.currentAnimation.id)
				this.currentAnimation = null
			}

			const startPos = this.context.camera.position.clone()
			const startTarget = this.context.controls.target.clone()
			const duration = options?.duration ?? this.DEFAULT_ANIMATION_DURATION
			const startTime = performance.now()

			// 發送動畫開始事件
			this.emit('camera:moveStart', {
				position: startPos,
				target: startTarget
			})

			const animate = () => {
				const elapsed = performance.now() - startTime
				const progress = Math.min(elapsed / duration, 1)

				// 緩入緩出立方
				const eased =
					progress < 0.5
						? 4 * progress * progress * progress
						: 1 - Math.pow(-2 * progress + 2, 3) / 2

				// 插值位置和注視目標
				this.context.camera.position.lerpVectors(startPos, targetPos, eased)
				this.context.controls.target.lerpVectors(startTarget, targetLookAt, eased)
				this.context.controls.update()

				// 發送進度事件
				this.emit('camera:animating', { progress })

				if (progress < 1) {
					this.currentAnimation = {
						id: requestAnimationFrame(animate),
						startTime,
						duration,
						startPos,
						startTarget,
						targetPos,
						targetLookAt,
						onComplete: options?.onComplete
					}
				} else {
					// 動畫完成
					this.currentAnimation = null

					this.emit('camera:moveEnd', {
						position: this.context.camera.position.clone(),
						target: this.context.controls.target.clone()
					})

					options?.onComplete?.()
					resolve()
				}
			}

			animate()
		})
	}

	/**
	 * 設置最佳距離
	 */
	setOptimalDistance(target?: THREE.Object3D): void {
		const obj = target || this.findModel()
		if (!obj) return

		const box = new THREE.Box3().setFromObject(obj)
		const currentDirection = new THREE.Vector3()
			.copy(this.context.camera.position)
			.sub(this.context.controls.target)
			.normalize()

		const distance = calculateOptimalDistance(
			box,
			this.context.camera,
			currentDirection,
			this.CAMERA_PADDING
		)

		const center = box.getCenter(new THREE.Vector3())
		this.context.camera.position.copy(center.clone().add(currentDirection.multiplyScalar(distance)))
		this.context.controls.target.copy(center)
		this.context.controls.update()
	}

	/**
	 * 每幀更新 - 同步設置變化
	 */
	update(): void {
		// 同步設置變化（輪詢方式，避免 callback）
		const currentRayBasedZoom = settingsStore.rayBasedZoom
		if (currentRayBasedZoom !== this.rayBasedZoomEnabled) {
			this.rayBasedZoomEnabled = currentRayBasedZoom
			console.log(`[CameraPlugin] Ray-based zoom ${currentRayBasedZoom ? 'enabled' : 'disabled'}`)
		}
	}

	/**
	 * 啟用/禁用自動旋轉
	 */
	enableAutoRotate(enabled: boolean, speed: number = 0.5): void {
		this.context.controls.autoRotate = enabled
		this.context.controls.autoRotateSpeed = speed
	}

	/**
	 * 檢查是否有動畫正在執行
	 */
	isAnimating(): boolean {
		return this.currentAnimation !== null
	}

	/**
	 * 取消當前動畫
	 */
	cancelAnimation(): void {
		if (this.currentAnimation) {
			cancelAnimationFrame(this.currentAnimation.id)
			this.currentAnimation = null
		}
	}

	/**
	 * 設定滾輪監聽器
	 */
	private setupWheelListener(): void {
		this.wheelHandler = (event: WheelEvent) => {
			if (this.rayBasedZoomEnabled) {
				event.preventDefault()
				event.stopPropagation()
				this.handleRayBasedZoom(event)
			}
		}

		this.context.canvas.addEventListener('wheel', this.wheelHandler, { passive: false })
	}

	/**
	 * 處理 ray-based 滾輪縮放
	 */
	private handleRayBasedZoom(event: WheelEvent): void {
		// 動畫執行中，忽略滾輪
		if (this.currentAnimation) return

		const canvas = this.context.canvas
		const camera = this.context.camera
		const controls = this.context.controls

		// 計算滑鼠在視口中的標準化座標 (NDC)
		const rect = canvas.getBoundingClientRect()
		const mouse = new THREE.Vector2(
			((event.clientX - rect.left) / rect.width) * 2 - 1,
			-((event.clientY - rect.top) / rect.height) * 2 + 1
		)

		// 從相機和滑鼠位置建立射線
		this.raycaster.setFromCamera(mouse, camera)

		// 縮放方向 = 射線方向（已歸一化）
		const zoomDirection = this.raycaster.ray.direction.clone()

		// 計算縮放量（deltaY 正值 = 向下滾 = 縮小）
		const delta = event.deltaY * this.ZOOM_SPEED

		// 計算新位置：沿射線反方向移動（-delta）
		const movement = zoomDirection.multiplyScalar(-delta)
		const newPosition = camera.position.clone().add(movement)

		// 檢查到 target 的距離
		const distanceToTarget = newPosition.distanceTo(controls.target)

		// 如果距離太小，拒絕移動（不能穿過 target）
		if (distanceToTarget < this.MIN_DISTANCE_TO_TARGET) {
			return
		}

		// 允許移動
		camera.position.copy(newPosition)

		// 發送事件通知
		this.emit('camera:viewChanged', {
			position: camera.position.clone(),
			target: controls.target.clone()
		})
	}

	/**
	 * 監聽 OrbitControls 變化
	 */
	private setupControlsListener(): void {
		this.controlsChangeHandler = () => {
			// 只在非動畫狀態下發送事件
			if (!this.currentAnimation) {
				this.emit('camera:viewChanged', {
					position: this.context.camera.position.clone(),
					target: this.context.controls.target.clone()
				})
			}
		}

		this.context.controls.addEventListener('change', this.controlsChangeHandler)
	}

	/**
	 * 查找模型
	 */
	private findModel(): THREE.Group | undefined {
		return this.context.scene.children.find((child) => child.userData.isModel) as
			| THREE.Group
			| undefined
	}

	/**
	 * 查找對象
	 */
	private findObject(model: THREE.Group, nameOrUuid: string): THREE.Object3D | undefined {
		let target: THREE.Object3D | undefined

		model.traverse((child) => {
			if (child.name === nameOrUuid || child.uuid === nameOrUuid) {
				target = child
			}
		})

		return target
	}

	protected onDispose(): void {
		this.cancelAnimation()

		// 移除事件監聽
		if (this.controlsChangeHandler) {
			this.context.controls.removeEventListener('change', this.controlsChangeHandler)
		}

		// 移除滾輪監聽
		if (this.wheelHandler) {
			this.context.canvas.removeEventListener('wheel', this.wheelHandler)
		}

		console.log('[CameraPlugin] Disposed')
	}
}
