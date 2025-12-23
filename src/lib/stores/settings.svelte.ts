export class SettingsStore {
	_gridVisible = $state(false)
	private _onGridChange: ((visible: boolean) => void) | null = null

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
}

export const settingsStore = new SettingsStore()
