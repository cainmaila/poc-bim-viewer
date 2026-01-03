/**
 * Viewer 控制 Store
 * 提供直接操控 BIMViewer 場景元素的方法
 * 不通過響應式系統，避免不必要的重新渲染
 */

interface ViewerControlInterface {
	setGridVisible(visible: boolean): void
	setBoundingBoxVisible(visible: boolean): void
	syncInitialState(): void
	setSelectedNode(nodeId: string | null): void
	getSelectedNode(): string | null
	clearSelectedNode(): void
}

class ViewerControlStore implements ViewerControlInterface {
	private gridVisibleCallback: ((visible: boolean) => void) | null = null
	private boundingBoxVisibleCallback: ((visible: boolean) => void) | null = null
	private initialStateSynced = false

	/**
	 * 當前選中的節點 ID（響應式狀態）
	 * 用於 TreeView 等 UI 組件顯示選中效果
	 */
	selectedNodeId = $state<string | null>(null)

	/**
	 * 註冊網格可見性控制回調
	 */
	registerGridVisibleCallback(callback: (visible: boolean) => void) {
		this.gridVisibleCallback = callback
	}

	/**
	 * 註冊邊界盒可見性控制回調
	 */
	registerBoundingBoxVisibleCallback(callback: (visible: boolean) => void) {
		this.boundingBoxVisibleCallback = callback
	}

	/**
	 * 直接設置網格可見性
	 * 調用已註冊的回調而不觸發響應式系統
	 */
	setGridVisible(visible: boolean): void {
		if (this.gridVisibleCallback) {
			this.gridVisibleCallback(visible)
		}
	}

	/**
	 * 直接設置邊界盒可見性
	 */
	setBoundingBoxVisible(visible: boolean): void {
		if (this.boundingBoxVisibleCallback) {
			this.boundingBoxVisibleCallback(visible)
		}
	}

	/**
	 * 同步初始狀態（只執行一次）
	 * 由 SettingsMenu 在初始化時調用
	 */
	syncInitialState(): void {
		if (this.initialStateSynced) return
		this.initialStateSynced = true
	}

	/**
	 * 設置選中的節點 ID
	 */
	setSelectedNode(nodeId: string | null): void {
		this.selectedNodeId = nodeId
	}

	/**
	 * 獲取當前選中的節點 ID
	 */
	getSelectedNode(): string | null {
		return this.selectedNodeId
	}

	/**
	 * 清除選中的節點
	 */
	clearSelectedNode(): void {
		this.selectedNodeId = null
	}

	/**
	 * 重置狀態（用於場景重新初始化時）
	 */
	reset(): void {
		this.initialStateSynced = false
		this.selectedNodeId = null
	}
}

export const viewerControlStore = new ViewerControlStore()
