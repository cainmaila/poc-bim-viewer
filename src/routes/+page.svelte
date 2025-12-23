<script lang="ts">
	import BIMViewer from '$lib/components/BIMViewer.svelte'
	import Sidebar from '$lib/components/Sidebar.svelte'
	import SettingsMenu from '$lib/components/SettingsMenu.svelte'
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { base } from '$app/paths'
	import { onMount } from 'svelte'
	import { getActiveModelKey, getModelFromCache } from '$lib/utils/indexedDBCache'

	const defaultModelUrl = `${base}/building.glb`
	let isDragOver = $state(false)
	let viewerRef = $state<ReturnType<typeof BIMViewer>>()

	onMount(async () => {
		const activeKey = await getActiveModelKey()
		if (activeKey) {
			const cachedData = await getModelFromCache(activeKey)
			if (cachedData) {
				// 從緩存載入模型
				await modelStore.loadModelFromCache(activeKey)
			}
		}
	})

	function handleDragOver(e: DragEvent) {
		e.preventDefault()
		isDragOver = true
	}

	function handleDragLeave() {
		isDragOver = false
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault()
		isDragOver = false

		const files = e.dataTransfer?.files
		if (!files || files.length === 0) return

		const file = files[0]
		if (!file.name.toLowerCase().endsWith('.glb')) {
			modelStore.clearError()
			// 設定臨時錯誤
			modelStore.error = '檔案格式錯誤，請使用 .glb 模型'
			return
		}

		if (file.size > 50 * 1024 * 1024) {
			modelStore.clearError()
			// 設定臨時錯誤
			modelStore.error = '模型過大，建議處理素材(>50MB)'
			return
		}

		await modelStore.loadModelFromFile(file)
	}

	function handleSelect(id: string) {
		viewerRef?.flyTo(id)
	}
</script>

<div
	class="viewer-container"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="region"
	aria-label="BIM Viewer"
>
	<div class="viewer-wrapper">
		<BIMViewer bind:this={viewerRef} autoRotate={false} />
		{#if !modelStore.model && !modelStore.isLoading}
			<div class="empty-state-hint">
				<div class="hint-content">
					<span class="hint-icon">📦</span>
					<h3>尚未載入模型</h3>
					<p>請將 .glb 檔案拖曳至此處開始</p>
				</div>
			</div>
		{/if}
	</div>

	<div class="sidebar-wrapper">
		<Sidebar treeData={modelStore.treeData} onSelect={handleSelect} />
	</div>

	<SettingsMenu
		onGridToggle={(visible) => {
			viewerRef?.setGridVisible(visible)
		}}
	/>

	{#if isDragOver}
		<div class="drag-overlay">
			<div class="drag-message">請在此處放開以載入模型</div>
		</div>
	{/if}

	{#if modelStore.isLoading}
		<LoadingOverlay
			isLoading={true}
			progress={modelStore.loadProgress}
			fromCache={modelStore.fromCache}
		/>
	{/if}

	{#if modelStore.error}
		<div class="error-message">
			<div class="error-icon">⚠️</div>
			<div class="error-text">{modelStore.error}</div>
			<button class="retry-button" onclick={() => modelStore.loadModel(defaultModelUrl)}>
				重試
			</button>
		</div>
	{/if}
</div>

<style lang="postcss">
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	.viewer-container {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #f0f0f0;
	}

	.viewer-wrapper {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.sidebar-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 10;
		pointer-events: none; /* 讓事件穿過包裝器 */
		display: flex; /* 允許子元素自行調整大小 */
	}

	/* 我們需要確保Sidebar本身捕獲指針事件 */
	:global(.sidebar) {
		pointer-events: auto;
		box-shadow: 4px 0 16px rgba(0, 0, 0, 0.1); /* 添加陰影以增加深度 */
	}

	.error-message {
		position: absolute;
		top: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(220, 38, 38, 0.95);
		color: white;
		padding: 1.5rem 2rem;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: 400px;
		z-index: 10000;
	}

	.error-icon {
		font-size: 2rem;
	}

	.error-text {
		text-align: center;
		font-size: 1rem;
		line-height: 1.5;
	}

	.retry-button {
		padding: 0.5rem 1.5rem;
		background: white;
		color: #dc2626;
		border: none;
		border-radius: 4px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			background: #f3f4f6;
			transform: translateY(-1px);
		}

		&:active {
			transform: translateY(0);
		}
	}

	.drag-overlay {
		position: absolute;
		inset: 0;
		background: rgba(59, 130, 246, 0.4);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9000;
		border: 4px dashed #3b82f6;
		pointer-events: none;
	}

	.drag-message {
		background: white;
		padding: 1rem 2rem;
		border-radius: 99px;
		font-weight: 600;
		color: #3b82f6;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.empty-state-hint {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		z-index: 50;
	}

	.hint-content {
		text-align: center;
		padding: 3rem;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(8px);
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
		max-width: 400px;
	}

	.hint-icon {
		font-size: 4rem;
		display: block;
		margin-bottom: 1.5rem;
		opacity: 0.8;
	}

	.hint-content h3 {
		font-size: 1.5rem;
		margin: 0 0 0.75rem 0;
		color: #1f2937;
		font-weight: 600;
	}

	.hint-content p {
		font-size: 1rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.5;
	}
</style>
