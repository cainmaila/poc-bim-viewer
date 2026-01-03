import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { BasePlugin } from '../core/IPlugin'
import { settingsStore } from '$lib/stores/settings.svelte'

/**
 * FPSControlsPlugin - FPS 第一人稱射擊遊戲風格相機控制
 * 使用 Three.js PointerLockControls 實現真實 FPS 遊戲體驗
 */
export class FPSControlsPlugin extends BasePlugin {
	readonly name = 'fpsControls'

	// FPS 狀態
	private fpsEnabled = false
	private keysPressed = new Map<string, boolean>()
	private controlsPaused = false

	// PointerLockControls 實例
	private pointerLockControls: PointerLockControls | null = null

	// 常數配置
	private readonly MOVE_SPEED = 1.5 // 單位/秒（人類步行速度約 1.4 m/s）
	private readonly SCROLL_SPEED = 0.05 // 滾輪移動速度

	// 事件處理器（儲存引用以便清理）
	private handleLock = () => {
		console.log('[FPSControlsPlugin] Pointer lock acquired')
	}

	private handleUnlock = () => {
		console.log('[FPSControlsPlugin] Pointer lock released')
		// 當指標鎖定被釋放時（ESC 或其他方式），退出 FPS 模式
		if (this.fpsEnabled) {
			settingsStore.fpsMode = false
		}
	}

	private handleKeyDown = (e: KeyboardEvent) => {
		if (!this.fpsEnabled || this.controlsPaused) return

		const key = e.code

		// WASD 移動
		if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(key)) {
			e.preventDefault()
			this.keysPressed.set(key, true)
		}
	}

	private handleKeyUp = (e: KeyboardEvent) => {
		const key = e.code
		this.keysPressed.set(key, false)
	}

	private handleWheel = (e: WheelEvent) => {
		if (!this.fpsEnabled || this.controlsPaused || !this.pointerLockControls) return

		e.preventDefault()

		// 獲取視線方向（與 W/S 一致）
		const direction = new THREE.Vector3()
		this.pointerLockControls.getDirection(direction)

		// 滾輪向下為正值（後退），向上為負值（前進）
		const movement = direction.multiplyScalar(-e.deltaY * this.SCROLL_SPEED)

		this.context.camera.position.add(movement)
		this.context.controls.target.add(movement)
	}

	protected async onInit(): Promise<void> {
		console.log('[FPSControlsPlugin] Initialized')

		// 創建 PointerLockControls
		this.pointerLockControls = new PointerLockControls(this.context.camera, this.context.canvas)

		// 讀取初始設定
		this.fpsEnabled = settingsStore.fpsMode

		// 監聽動畫事件（動畫執行時暫停 FPS 控制）
		this.on('camera:moveStart', () => this.pauseFPSControls())
		this.on('camera:moveEnd', () => this.resumeFPSControls())

		// 如果已啟用，立即啟動
		if (this.fpsEnabled) {
			this.enableFPSMode()
		}
	}

	update(deltaTime: number): void {
		// 同步設置變化（輪詢方式，避免 callback）
		const currentFPSMode = settingsStore.fpsMode
		if (currentFPSMode !== this.fpsEnabled) {
			this.fpsEnabled = currentFPSMode
			if (currentFPSMode) {
				this.enableFPSMode()
			} else {
				this.disableFPSMode()
			}
		}

		if (this.fpsEnabled && !this.controlsPaused && this.pointerLockControls?.isLocked) {
			this.updateFPSMovement(deltaTime)
		}
	}

	/**
	 * 啟用 FPS 模式
	 */
	private enableFPSMode(): void {
		console.log('[FPSControlsPlugin] Enabling FPS mode')

		if (!this.pointerLockControls) return

		// 禁用 OrbitControls
		this.context.controls.enabled = false

		// 附加事件監聽器
		this.attachEventListeners()

		this.fpsEnabled = true

		// 請求 Pointer Lock
		this.pointerLockControls.lock()

		// 發送事件（UI 可以監聽此事件來隱藏 UI）
		this.emit('fps:modeChanged', { enabled: true })
	}

	/**
	 * 禁用 FPS 模式
	 */
	private disableFPSMode(): void {
		console.log('[FPSControlsPlugin] Disabling FPS mode')

		// 釋放 Pointer Lock
		if (this.pointerLockControls?.isLocked) {
			this.pointerLockControls.unlock()
		}

		// 恢復 OrbitControls
		this.context.controls.enabled = true

		// 同步 OrbitControls target 到當前視線方向
		this.syncOrbitControlsTarget()

		// 移除事件監聽器
		this.removeEventListeners()

		// 清除狀態
		this.keysPressed.clear()

		this.fpsEnabled = false

		// 發送事件（UI 可以監聽此事件來顯示 UI）
		this.emit('fps:modeChanged', { enabled: false })
	}

	/**
	 * 同步 OrbitControls target 到當前相機視線方向
	 */
	private syncOrbitControlsTarget(): void {
		if (!this.pointerLockControls) return

		const direction = new THREE.Vector3()
		this.pointerLockControls.getDirection(direction)

		// 將 target 設置在相機前方一定距離
		this.context.controls.target
			.copy(this.context.camera.position)
			.add(direction.multiplyScalar(10))
	}

	/**
	 * 根據 WASD 按鍵更新 FPS 移動
	 */
	private updateFPSMovement(deltaTime: number): void {
		if (!this.pointerLockControls) return

		// 獲取視線方向
		const direction = new THREE.Vector3()
		this.pointerLockControls.getDirection(direction)

		// W/S: 沿視線方向移動（包含 Y 軸）
		const forward = direction.clone()

		// A/D: 水平面上的右側方向
		const right = new THREE.Vector3()
		right.crossVectors(forward, this.context.camera.up).normalize()

		// 計算移動向量
		const movement = new THREE.Vector3()
		if (this.keysPressed.get('KeyW')) movement.add(forward)
		if (this.keysPressed.get('KeyS')) movement.sub(forward)
		if (this.keysPressed.get('KeyD')) movement.add(right)
		if (this.keysPressed.get('KeyA')) movement.sub(right)

		// 應用移動
		if (movement.length() > 0) {
			const offset = movement.normalize().multiplyScalar(this.MOVE_SPEED * deltaTime)
			this.context.camera.position.add(offset)
			this.context.controls.target.add(offset)
		}
	}

	/**
	 * 暫停 FPS 控制（動畫執行時）
	 */
	private pauseFPSControls(): void {
		console.log('[FPSControlsPlugin] Pausing FPS controls for animation')
		this.controlsPaused = true
		this.keysPressed.clear()
	}

	/**
	 * 恢復 FPS 控制（動畫結束後）
	 */
	private resumeFPSControls(): void {
		if (this.fpsEnabled) {
			console.log('[FPSControlsPlugin] Resuming FPS controls after animation')
			this.controlsPaused = false
		}
	}

	/**
	 * 附加事件監聯器
	 */
	private attachEventListeners(): void {
		if (!this.pointerLockControls) return

		this.pointerLockControls.addEventListener('lock', this.handleLock)
		this.pointerLockControls.addEventListener('unlock', this.handleUnlock)

		this.context.canvas.addEventListener('wheel', this.handleWheel, { passive: false })

		window.addEventListener('keydown', this.handleKeyDown)
		window.addEventListener('keyup', this.handleKeyUp)
	}

	/**
	 * 移除事件監聽器
	 */
	private removeEventListeners(): void {
		if (!this.pointerLockControls) return

		this.pointerLockControls.removeEventListener('lock', this.handleLock)
		this.pointerLockControls.removeEventListener('unlock', this.handleUnlock)

		this.context.canvas.removeEventListener('wheel', this.handleWheel)

		window.removeEventListener('keydown', this.handleKeyDown)
		window.removeEventListener('keyup', this.handleKeyUp)
	}

	/**
	 * 檢查 FPS 模式是否啟用
	 */
	isEnabled(): boolean {
		return this.fpsEnabled
	}

	protected onDispose(): void {
		this.disableFPSMode()
		this.removeEventListeners()
		this.pointerLockControls?.dispose()
		console.log('[FPSControlsPlugin] Disposed')
	}
}
