export class SettingsStore {
	_gridVisible = $state(false)
	_boundingBoxVisible = $state(false)
	private _onGridChange: ((visible: boolean) => void) | null = null
	private _onBoundingBoxChange: ((visible: boolean) => void) | null = null

	constructor() {
		// Initialize with default values or load from localStorage if needed in the future
	}

	get gridVisible() {
		return this._gridVisible
	}

	set gridVisible(value: boolean) {
		this._gridVisible = value
		this._onGridChange?.(value)
	}

	toggleGrid() {
		this.gridVisible = !this._gridVisible
	}

	onGridVisibilityChange(callback: (visible: boolean) => void) {
		this._onGridChange = callback
	}

	get boundingBoxVisible() {
		return this._boundingBoxVisible
	}

	set boundingBoxVisible(value: boolean) {
		this._boundingBoxVisible = value
		this._onBoundingBoxChange?.(value)
	}

	toggleBoundingBox() {
		this.boundingBoxVisible = !this._boundingBoxVisible
	}

	onBoundingBoxVisibilityChange(callback: (visible: boolean) => void) {
		this._onBoundingBoxChange = callback
	}
}

export const settingsStore = new SettingsStore()
