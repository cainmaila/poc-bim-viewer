<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte'

	interface Props {
		onGridToggle?: (visible: boolean) => void
		onBoundingBoxToggle?: (visible: boolean) => void
	}

	let { onGridToggle, onBoundingBoxToggle }: Props = $props()

	let isOpen = $state(false)

	function toggleMenu() {
		isOpen = !isOpen
	}

	function closeMenu(e: MouseEvent) {
		const target = e.target as HTMLElement
		if (!target.closest('.settings-container')) {
			isOpen = false
		}
	}
</script>

<svelte:window onclick={closeMenu} />

<div class="settings-container">
	<button
		class="settings-btn"
		onclick={toggleMenu}
		aria-label="System Settings"
		class:active={isOpen}
	>
		⚙️
	</button>

	{#if isOpen}
		<div class="settings-menu">
			<h3 class="menu-title">系統設定</h3>
			<div class="setting-item">
				<span class="setting-label">顯示網格</span>
				<label class="switch">
					<input
						type="checkbox"
						checked={settingsStore.gridVisible}
						onchange={() => {
							settingsStore.toggleGrid()
							onGridToggle?.(settingsStore.gridVisible)
						}}
					/>
					<span class="slider round"></span>
				</label>
			</div>
			<div class="setting-item">
				<span class="setting-label">顯示選取物件的Bounding Box</span>
				<label class="switch">
					<input
						type="checkbox"
						checked={settingsStore.boundingBoxVisible}
						onchange={() => {
							settingsStore.toggleBoundingBox()
							onBoundingBoxToggle?.(settingsStore.boundingBoxVisible)
						}}
					/>
					<span class="slider round"></span>
				</label>
			</div>
		</div>
	{/if}
</div>

<style lang="postcss">
	.settings-container {
		position: absolute;
		top: 1rem;
		right: 1rem; /* Adjust positioning as needed */
		z-index: 100;
	}

	.settings-btn {
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid #e5e7eb;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: all 0.2s;

		&:hover {
			background: #fff;
			transform: scale(1.05);
		}

		&.active {
			background: #f3f4f6;
			transform: rotate(90deg);
		}
	}

	.settings-menu {
		position: absolute;
		top: 50px;
		right: 0;
		background: #fff;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		width: 200px;
		padding: 12px;
		animation: slideIn 0.2s ease-out;
		border: 1px solid #e5e7eb;
	}

	.menu-title {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: #374151;
		border-bottom: 1px solid #f3f4f6;
		padding-bottom: 8px;
	}

	.setting-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 0;
	}

	.setting-label {
		font-size: 14px;
		color: #4b5563;
	}

	/* Toggle Switch CSS */
	.switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 20px;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		transition: 0.4s;
	}

	.slider:before {
		position: absolute;
		content: '';
		height: 16px;
		width: 16px;
		left: 2px;
		bottom: 2px;
		background-color: white;
		transition: 0.4s;
	}

	input:checked + .slider {
		background-color: #2196f3;
	}

	input:checked + .slider:before {
		transform: translateX(20px);
	}

	.slider.round {
		border-radius: 34px;
	}

	.slider.round:before {
		border-radius: 50%;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
