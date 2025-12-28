# Three.js Plugin 架構開發指南

## 📋 目錄

- [概述](#概述)
- [核心概念](#核心概念)
- [快速開始](#快速開始)
- [創建新 Plugin](#創建新-plugin)
- [Plugin 生命周期](#plugin-生命周期)
- [EventBus 事件系統](#eventbus-事件系統)
- [依賴管理](#依賴管理)
- [最佳實踐](#最佳實踐)
- [範例：現有 Plugin](#範例現有-plugin)
- [故障排除](#故障排除)

---

## 概述

這個 Plugin 架構提供了一個**可復用、模組化、松耦合**的 Three.js 功能擴展系統。

### 設計目標

- **跨專案復用** - Plugin 可在不同 BIM/3D 專案中使用
- **功能模組化** - 每個 Plugin 專注單一職責
- **松耦合通訊** - 通過 EventBus 實現 Plugin 間通訊
- **依賴解析** - 自動處理 Plugin 初始化順序
- **類型安全** - 完整的 TypeScript 類型支持

### 核心組件

```
src/lib/plugins/
├── core/                    # 核心系統
│   ├── EventBus.ts         # 事件總線（松耦合通訊）
│   ├── IPlugin.ts          # Plugin 接口定義
│   ├── PluginContext.ts    # 共享資源定義
│   ├── PluginManager.ts    # Plugin 生命周期管理
│   └── index.ts
├── camera/                  # CameraPlugin 範例
│   ├── CameraPlugin.ts
│   ├── types.ts
│   └── index.ts
└── index.ts                # 統一導出
```

---

## 核心概念

### 1. PluginManager

負責管理所有 Plugin 的生命周期：

- **註冊** - `register(name, plugin)` 註冊 Plugin
- **初始化** - `init()` 按依賴順序初始化所有 Plugin
- **更新** - `update(deltaTime)` 在動畫循環中更新 Plugin
- **銷毀** - `dispose()` 按逆序清理所有 Plugin

### 2. PluginContext

所有 Plugin 共享的 Three.js 資源：

```typescript
interface PluginContext {
	scene: THREE.Scene // Three.js 場景
	camera: THREE.PerspectiveCamera // 相機
	renderer: THREE.WebGLRenderer // 渲染器
	controls: OrbitControls // 控制器
	canvas: HTMLCanvasElement // Canvas 元素
	eventBus: EventBus // 事件總線
	getPlugin<T>(name: string): T // 獲取其他 Plugin
}
```

### 3. EventBus

類型安全的事件系統，實現 Plugin 間松耦合通訊：

```typescript
// 訂閱事件
const subscription = eventBus.on('camera:moveEnd', (data) => {
	console.log('Camera moved to:', data.position)
})

// 發送事件
eventBus.emit('camera:moveEnd', {
	position: camera.position.clone(),
	target: controls.target.clone()
})

// 取消訂閱
subscription.unsubscribe()
```

### 4. IPlugin 接口

所有 Plugin 必須實現的接口：

```typescript
interface IPlugin {
	readonly name: string // Plugin 唯一名稱
	readonly dependencies?: string[] // 依賴的其他 Plugin
	init(context: PluginContext): Promise<void> | void // 初始化
	update?(deltaTime: number): void // 可選：動畫循環更新
	dispose(): void // 清理資源
}
```

---

## 快速開始

### 在 BIMViewer 中使用

```typescript
import { PluginManager, CameraPlugin } from '$lib/plugins'

// 1. 創建 PluginManager
const pluginManager = new PluginManager({
	scene,
	camera,
	renderer,
	controls,
	canvas
})

// 2. 註冊 Plugin
pluginManager.register('camera', new CameraPlugin())

// 3. 初始化所有 Plugin
await pluginManager.init()

// 4. 在動畫循環中更新
function animate() {
	requestAnimationFrame(animate)

	const deltaTime = calculateDeltaTime()
	pluginManager.update(deltaTime)

	renderer.render(scene, camera)
}

// 5. 清理時銷毀
pluginManager.dispose()
```

### 獲取 Plugin 實例

```typescript
const cameraPlugin = pluginManager.getPlugin<CameraPlugin>('camera')
cameraPlugin?.flyTo('objectName')
```

### 監聽事件

```typescript
const eventBus = pluginManager.getEventBus()

const subscription = eventBus.on('camera:moveEnd', (data) => {
	console.log('Camera animation completed')
})

// 清理時取消訂閱
subscription.unsubscribe()
```

---

## 創建新 Plugin

### 方式一：繼承 BasePlugin（推薦）

`BasePlugin` 提供了常用功能，減少重複代碼：

```typescript
import { BasePlugin } from '$lib/plugins/core/IPlugin'
import type * as THREE from 'three'

export class MyPlugin extends BasePlugin {
	readonly name = 'myPlugin'
	readonly dependencies = ['camera'] // 可選：依賴的其他 Plugin

	protected async onInit(): Promise<void> {
		// 初始化邏輯
		console.log('[MyPlugin] Initialized')

		// 訂閱事件
		this.on('camera:moveEnd', (data) => {
			console.log('Camera moved:', data.position)
		})

		// 獲取其他 Plugin
		const cameraPlugin = this.getPlugin<CameraPlugin>('camera')
	}

	update(deltaTime: number): void {
		// 可選：動畫循環更新
		// 注意：只在需要時實現此方法
	}

	protected onDispose(): void {
		// 清理資源
		console.log('[MyPlugin] Disposed')
	}

	// 公開方法
	public doSomething(): void {
		// 發送事件
		this.emit('myPlugin:actionCompleted', { success: true })
	}
}
```

### 方式二：直接實現 IPlugin

```typescript
import type { IPlugin, PluginContext } from '$lib/plugins/core/IPlugin'

export class MyPlugin implements IPlugin {
	readonly name = 'myPlugin'
	readonly dependencies = undefined

	private context!: PluginContext

	async init(context: PluginContext): Promise<void> {
		this.context = context
		console.log('[MyPlugin] Initialized')
	}

	update(deltaTime: number): void {
		// 更新邏輯
	}

	dispose(): void {
		console.log('[MyPlugin] Disposed')
	}
}
```

### 添加類型定義（可選）

創建 `types.ts` 定義 Plugin 使用的類型：

```typescript
// src/lib/plugins/myPlugin/types.ts
import type * as THREE from 'three'

export interface MyPluginOptions {
	enabled: boolean
	speed: number
}

export interface MyPluginState {
	isActive: boolean
	value: number
}
```

### 目錄結構

```
src/lib/plugins/
└── myPlugin/
    ├── MyPlugin.ts      # Plugin 實現
    ├── types.ts         # 類型定義
    └── index.ts         # 導出
```

---

## Plugin 生命周期

### 1. 註冊階段

```typescript
pluginManager.register('myPlugin', new MyPlugin())
```

- 必須在 `init()` 之前完成
- 如果重複註冊，會替換舊實例並發出警告

### 2. 初始化階段

```typescript
await pluginManager.init()
```

**執行順序：**

1. PluginManager 解析依賴關係（拓撲排序）
2. 按依賴順序依次調用 `plugin.init(context)`
3. 檢測循環依賴，如有則拋出錯誤
4. 所有 Plugin 初始化完成後發送 `pluginManager:initialized` 事件

**範例：**

```typescript
// Plugin A 無依賴 → 先初始化
class PluginA extends BasePlugin {
	readonly name = 'pluginA'
}

// Plugin B 依賴 Plugin A → 後初始化
class PluginB extends BasePlugin {
	readonly name = 'pluginB'
	readonly dependencies = ['pluginA']
}
```

初始化順序：`pluginA` → `pluginB`

### 3. 更新階段

```typescript
pluginManager.update(deltaTime)
```

- 在動畫循環中每幀調用
- 只有實現了 `update()` 方法的 Plugin 會被調用
- 如果 Plugin 拋出錯誤，不會影響其他 Plugin

### 4. 銷毀階段

```typescript
pluginManager.dispose()
```

- 按**初始化逆序**銷毀 Plugin（先初始化的後銷毀）
- 每個 Plugin 的 `dispose()` 被調用
- EventBus 被清理
- 所有 Plugin 引用被移除

---

## EventBus 事件系統

### 標準事件定義

所有標準事件在 `EventBus.ts` 中定義：

```typescript
export interface StandardEvents {
	// 相機事件
	'camera:moveStart': { position: THREE.Vector3; target: THREE.Vector3 }
	'camera:moveEnd': { position: THREE.Vector3; target: THREE.Vector3 }
	'camera:animating': { progress: number }
	'camera:viewChanged': { position: THREE.Vector3; target: THREE.Vector3 }
	'camera:resetView': { direction?: ViewDirection }

	// 物件事件
	'object:selected': { object: THREE.Object3D; id: string }
	'object:deselected': { object: THREE.Object3D | null }

	// Plugin 管理事件
	'pluginManager:initialized': undefined
}
```

### 訂閱事件

#### 基本訂閱

```typescript
const subscription = eventBus.on('camera:moveEnd', (data) => {
	console.log('Camera position:', data.position)
	console.log('Camera target:', data.target)
})

// 記得取消訂閱
subscription.unsubscribe()
```

#### 一次性訂閱

```typescript
eventBus.once('pluginManager:initialized', () => {
	console.log('All plugins initialized!')
})
```

#### 在 BasePlugin 中訂閱

```typescript
protected onInit(): void {
  // 方式一：使用便捷方法
  this.on('camera:moveEnd', (data) => {
    console.log('Camera moved')
  })

  // 方式二：直接使用 eventBus
  this.context.eventBus.on('object:selected', (data) => {
    console.log('Object selected:', data.id)
  })
}
```

### 發送事件

#### 基本發送

```typescript
eventBus.emit('camera:moveEnd', {
	position: camera.position.clone(),
	target: controls.target.clone()
})
```

#### 在 BasePlugin 中發送

```typescript
// 使用便捷方法
this.emit('camera:moveStart', {
	position: this.context.camera.position.clone(),
	target: this.context.controls.target.clone()
})
```

### 添加自定義事件

如果你的 Plugin 需要發送自定義事件，在 `EventBus.ts` 中添加：

```typescript
export interface StandardEvents {
	// ... 現有事件

	// 你的自定義事件
	'myPlugin:stateChanged': { isActive: boolean }
	'myPlugin:error': { message: string; code: number }
}
```

### 事件日誌

EventBus 會自動記錄最近 100 條事件（用於調試）：

```typescript
const logs = eventBus.getLogs()
console.table(logs)
```

---

## 依賴管理

### 聲明依賴

```typescript
export class SelectionPlugin extends BasePlugin {
	readonly name = 'selection'
	readonly dependencies = ['camera'] // 依賴 CameraPlugin

	protected onInit(): void {
		// 此時 camera Plugin 已初始化完成
		const cameraPlugin = this.getPlugin<CameraPlugin>('camera')
	}
}
```

### 多個依賴

```typescript
export class BoundingBoxPlugin extends BasePlugin {
	readonly name = 'boundingBox'
	readonly dependencies = ['camera', 'selection']

	protected onInit(): void {
		const cameraPlugin = this.getPlugin<CameraPlugin>('camera')
		const selectionPlugin = this.getPlugin<SelectionPlugin>('selection')
	}
}
```

### 依賴解析規則

1. **拓撲排序** - 自動按依賴順序初始化
2. **循環依賴檢測** - 如果 A → B → A，會拋出錯誤
3. **缺失依賴檢測** - 如果依賴的 Plugin 未註冊，會拋出錯誤

**範例：**

```typescript
// ✅ 正確：線性依賴
A (無依賴)
B (依賴 A)
C (依賴 B)

// 初始化順序：A → B → C

// ❌ 錯誤：循環依賴
A (依賴 B)
B (依賴 A)

// 會拋出：Error: Circular dependency detected
```

### 可選依賴（進階）

如果某個依賴是可選的，可以在 `init()` 中檢查：

```typescript
protected onInit(): void {
  const optionalPlugin = this.getPlugin<OptionalPlugin>('optional')

  if (optionalPlugin) {
    // 使用可選 Plugin
  } else {
    // 降級處理
  }
}
```

---

## 最佳實踐

### 1. Plugin 設計原則

#### 單一職責

每個 Plugin 應專注於一個功能領域：

```typescript
// ✅ 好：專注於相機控制
class CameraPlugin extends BasePlugin {
	flyTo() {}
	resetView() {}
	animateTo() {}
}

// ❌ 壞：混合多個職責
class MegaPlugin extends BasePlugin {
	flyTo() {} // 相機
	selectObject() {} // 選擇
	toggleGrid() {} // 網格
}
```

#### 松耦合

通過 EventBus 通訊，避免直接引用其他 Plugin：

```typescript
// ✅ 好：通過事件通訊
this.emit('camera:moveEnd', { position, target })

// ⚠️ 可接受：顯式依賴
const cameraPlugin = this.getPlugin<CameraPlugin>('camera')
cameraPlugin.flyTo('object')

// ❌ 壞：直接導入並創建實例
import { CameraPlugin } from '../camera'
const camera = new CameraPlugin() // 破壞生命周期管理
```

### 2. 性能優化

#### 只在需要時實現 update()

```typescript
// ✅ 好：無需每幀更新的 Plugin 不實現 update()
class GridPlugin extends BasePlugin {
	// 無 update() 方法
}

// ✅ 好：需要動畫的 Plugin 實現 update()
class CameraPlugin extends BasePlugin {
	update(deltaTime: number): void {
		if (this.currentAnimation) {
			this.updateAnimation(deltaTime)
		}
	}
}
```

#### 避免在 update() 中創建對象

```typescript
// ❌ 壞：每幀創建新 Vector3
update(deltaTime: number): void {
  const temp = new THREE.Vector3()  // 垃圾回收壓力
}

// ✅ 好：復用對象
private tempVector = new THREE.Vector3()

update(deltaTime: number): void {
  this.tempVector.copy(...)
}
```

### 3. 資源管理

#### 清理 Three.js 資源

```typescript
protected onDispose(): void {
  // 取消動畫
  if (this.animationId) {
    cancelAnimationFrame(this.animationId)
  }

  // 移除事件監聽
  this.context.controls.removeEventListener('change', this.handler)

  // 清理 Three.js 對象
  if (this.helper) {
    this.context.scene.remove(this.helper)
    this.helper.dispose()
  }

  // 清空引用
  this.helper = null
}
```

#### 取消事件訂閱

BasePlugin 會自動管理事件訂閱，但如果手動訂閱需要清理：

```typescript
private subscription: EventSubscription | null = null

protected onInit(): void {
  this.subscription = this.context.eventBus.on('event', handler)
}

protected onDispose(): void {
  this.subscription?.unsubscribe()
}
```

### 4. 類型安全

#### 使用泛型獲取 Plugin

```typescript
// ✅ 好：類型安全
const camera = this.getPlugin<CameraPlugin>('camera')
camera?.flyTo('object') // TypeScript 知道 flyTo 方法存在

// ❌ 壞：失去類型檢查
const camera = this.getPlugin('camera')
camera.flyTo('object') // 編譯錯誤
```

#### 定義完整的事件類型

```typescript
// ✅ 好：在 StandardEvents 中定義
export interface StandardEvents {
	'myPlugin:stateChanged': { isActive: boolean; value: number }
}

// ✅ 好：發送事件時有類型檢查
this.emit('myPlugin:stateChanged', { isActive: true, value: 42 })

// ❌ 壞：使用 any
this.emit('myPlugin:stateChanged', { random: 'data' }) // 類型錯誤
```

### 5. 錯誤處理

#### 在 Plugin 中捕獲錯誤

```typescript
protected async onInit(): Promise<void> {
  try {
    await this.loadResources()
  } catch (error) {
    console.error(`[${this.name}] Initialization failed:`, error)
    throw error  // 讓 PluginManager 知道初始化失敗
  }
}
```

#### PluginManager 會捕獲並記錄錯誤

```typescript
// PluginManager 內部實現
try {
	await plugin.init(this.context)
} catch (error) {
	console.error(`[PluginManager] Failed to initialize plugin "${name}":`, error)
	throw error // 阻止繼續初始化
}
```

---

## 範例：現有 Plugin

### CameraPlugin

完整的相機控制 Plugin，展示了所有最佳實踐：

```typescript
export class CameraPlugin extends BasePlugin {
  readonly name = 'camera'

  // 動畫狀態
  private currentAnimation: CameraAnimation | null = null

  // 配置常數
  private readonly CAMERA_PADDING = 0.15
  private readonly DEFAULT_ANIMATION_DURATION = 1200

  // 事件處理器
  private controlsChangeHandler?: () => void

  protected async onInit(): Promise<void> {
    // 監聽 OrbitControls 變化
    this.setupControlsListener()
  }

  // 公開方法：飛向物件
  async flyTo(objectName: string, options?: CameraAnimationOptions): Promise<void> {
    const model = this.findModel()
    if (!model) return

    const target = this.findObject(model, objectName)
    if (!target) return

    return this.flyToObject(target, options)
  }

  async flyToObject(target: THREE.Object3D, options?: CameraAnimationOptions): Promise<void> {
    // 計算目標位置
    const box = new THREE.Box3().setFromObject(target)
    const center = box.getCenter(new THREE.Vector3())
    const viewDirection = selectViewDirection(currentDirection, box)
    const distance = calculateOptimalDistance(box, this.context.camera, viewDirection)
    const targetPos = center.clone().add(viewDirection.multiplyScalar(distance))

    // 發送事件
    this.emit('object:selected', { object: target, id: target.uuid })

    // 執行動畫
    return this.animateCameraTo(targetPos, center, options)
  }

  // 動畫實現（使用 Promise）
  animateCameraTo(
    targetPos: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    options?: CameraAnimationOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      // 取消當前動畫
      this.cancelAnimation()

      const startTime = performance.now()
      this.emit('camera:moveStart', { position: startPos, target: startTarget })

      const animate = () => {
        const progress = Math.min(elapsed / duration, 1)
        const eased = this.easeInOutCubic(progress)

        this.context.camera.position.lerpVectors(startPos, targetPos, eased)
        this.context.controls.target.lerpVectors(startTarget, targetLookAt, eased)

        if (progress < 1) {
          this.currentAnimation = { id: requestAnimationFrame(animate), ... }
        } else {
          this.emit('camera:moveEnd', { position, target })
          resolve()
        }
      }

      animate()
    })
  }

  protected onDispose(): void {
    this.cancelAnimation()

    if (this.controlsChangeHandler) {
      this.context.controls.removeEventListener('change', this.controlsChangeHandler)
    }
  }
}
```

**關鍵點：**

- ✅ 使用 BasePlugin 減少重複代碼
- ✅ 通過 EventBus 發送事件（`camera:moveStart`, `camera:moveEnd`）
- ✅ 提供 Promise 返回值（支援 `await`）
- ✅ 妥善管理動畫狀態和取消
- ✅ 完整的資源清理

---

## 故障排除

### 常見問題

#### 1. Plugin 未初始化

**錯誤：** `Cannot read property 'getPlugin' of undefined`

**原因：** 在 PluginManager.init() 之前調用了 Plugin 方法

**解決：**

```typescript
// ❌ 錯誤
const pluginManager = new PluginManager(...)
pluginManager.register('camera', new CameraPlugin())
const camera = pluginManager.getPlugin('camera')  // 此時 Plugin 未初始化

// ✅ 正確
await pluginManager.init()
const camera = pluginManager.getPlugin('camera')
```

#### 2. 循環依賴

**錯誤：** `Error: [PluginManager] Circular dependency detected: pluginA`

**原因：** Plugin 之間存在循環依賴

**解決：** 重新設計依賴關係，或通過 EventBus 解耦

```typescript
// ❌ 錯誤：循環依賴
class PluginA extends BasePlugin {
	readonly dependencies = ['pluginB']
}
class PluginB extends BasePlugin {
	readonly dependencies = ['pluginA']
}

// ✅ 正確：使用事件解耦
class PluginA extends BasePlugin {
	protected onInit(): void {
		this.on('pluginB:actionComplete', () => {
			// 響應 Plugin B 的事件
		})
	}
}
class PluginB extends BasePlugin {
	doAction(): void {
		this.emit('pluginB:actionComplete', {})
	}
}
```

#### 3. 依賴缺失

**錯誤：** `Error: [PluginManager] Plugin "pluginB" depends on missing plugin "pluginA"`

**原因：** 聲明的依賴未註冊

**解決：** 確保所有依賴都已註冊

```typescript
// ❌ 錯誤：未註冊 pluginA
pluginManager.register('pluginB', new PluginB())

// ✅ 正確：先註冊依賴
pluginManager.register('pluginA', new PluginA())
pluginManager.register('pluginB', new PluginB())
```

#### 4. 事件未觸發

**問題：** 訂閱了事件但沒有收到通知

**檢查清單：**

1. 確認事件名稱拼寫正確
2. 確認在 `init()` 之後訂閱
3. 確認發送方正確調用 `emit()`
4. 檢查 EventBus 日誌：`eventBus.getLogs()`

```typescript
// 調試事件
const logs = pluginManager.getEventBus().getLogs()
console.table(logs) // 查看最近的事件
```

#### 5. 內存洩漏

**症狀：** 應用運行一段時間後變慢

**排查：**

1. 檢查是否正確調用 `dispose()`
2. 檢查是否取消了 `requestAnimationFrame`
3. 檢查是否移除了事件監聽器
4. 檢查是否清理了 Three.js 資源

```typescript
// ✅ 完整的清理範例
protected onDispose(): void {
  // 1. 取消動畫
  if (this.animationId) {
    cancelAnimationFrame(this.animationId)
  }

  // 2. 移除事件監聽
  this.context.controls.removeEventListener('change', this.handler)

  // 3. 清理 Three.js 對象
  if (this.helper) {
    this.context.scene.remove(this.helper)
    this.helper.geometry?.dispose()
    this.helper.material?.dispose()
  }

  // 4. 清空引用
  this.helper = null
}
```

---

## 進階主題

### 與 Svelte 5 Runes 集成

Plugin 內部**不應使用** Svelte 特性（破壞復用性），但可以通過事件與 Svelte 組件通訊：

```svelte
<script lang="ts">
	import { pluginManager } from './viewer'

	// Svelte 5 響應式狀態
	let cameraPosition = $state({ x: 0, y: 0, z: 0 })

	// 訂閱 Plugin 事件
	$effect(() => {
		const eventBus = pluginManager.getEventBus()

		const subscription = eventBus.on('camera:viewChanged', (data) => {
			// 更新 Svelte 狀態
			cameraPosition = {
				x: data.position.x,
				y: data.position.y,
				z: data.position.z
			}
		})

		return () => subscription.unsubscribe()
	})
</script>

<div>Camera: {cameraPosition.x.toFixed(2)}, {cameraPosition.y.toFixed(2)}</div>
```

### 動態載入 Plugin

```typescript
// 延遲載入 Plugin
async function loadPlugin(name: string) {
	const module = await import(`./plugins/${name}/index.js`)
	const PluginClass = module.default

	pluginManager.register(name, new PluginClass())
	await pluginManager.init()
}

// 使用
await loadPlugin('advancedLighting')
```

### Plugin 配置

```typescript
export interface LightingPluginConfig {
	ambientIntensity: number
	shadowsEnabled: boolean
}

export class LightingPlugin extends BasePlugin {
	readonly name = 'lighting'

	constructor(private config: LightingPluginConfig) {
		super()
	}

	protected onInit(): void {
		this.setupLights(this.config)
	}
}

// 使用
pluginManager.register(
	'lighting',
	new LightingPlugin({
		ambientIntensity: 0.5,
		shadowsEnabled: true
	})
)
```

---

## 參考資源

### 現有 Plugin

- **CameraPlugin** - `src/lib/plugins/camera/CameraPlugin.ts`
  - 相機控制、動畫、視角切換
  - 完整的最佳實踐範例

### 核心系統

- **EventBus** - `src/lib/plugins/core/EventBus.ts`
- **IPlugin** - `src/lib/plugins/core/IPlugin.ts`
- **PluginManager** - `src/lib/plugins/core/PluginManager.ts`

### 工具函數

- **cameraUtils** - `src/lib/utils/cameraUtils.ts`
  - `calculateOptimalDistance()` - 計算最佳相機距離
  - `selectViewDirection()` - 選擇最佳視角

---

## 未來擴展建議

根據當前架構，建議優先開發以下 Plugin：

1. **SelectionPlugin** - 物件選擇和高亮（X-Ray、Outline）
2. **KeyboardPlugin** - 鍵盤控制和快捷鍵系統
3. **GridPlugin** - 網格助手管理
4. **BoundingBoxPlugin** - 邊界盒助手（依賴 SelectionPlugin）
5. **LightingPlugin** - 燈光配置預設

每個新 Plugin 都應遵循本文檔的最佳實踐。

---

## 總結

這個 Plugin 架構提供了：

- ✅ **松耦合** - EventBus 實現 Plugin 間通訊
- ✅ **可擴展** - 新 Plugin 只需實現 IPlugin 接口
- ✅ **可測試** - 每個 Plugin 可獨立測試
- ✅ **類型安全** - 完整的 TypeScript 支持
- ✅ **跨專案復用** - 核心系統獨立於業務邏輯

遵循本文檔的指南，你可以輕鬆創建高質量、可復用的 Three.js Plugin！

---

**文檔版本：** 1.0.0
**最後更新：** 2025-01-28
**維護者：** BIM Viewer 開發團隊
