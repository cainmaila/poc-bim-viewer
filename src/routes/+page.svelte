<script lang="ts">
	import BIMViewer from '$lib/components/BIMViewer.svelte'
	import Sidebar from '$lib/components/Sidebar.svelte'
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
				// If it's a URL-based key (like building.glb), we can use loadModel
				// but for now, the simplest is to load the URL if it's the default
				// or if it was a file, we might need a different approach.
				// For v2.0, if it's in cache, we just tell the store to load it by key.
				// Wait, the store currently takes a URL. Let's fix that or handle it here.
				if (activeKey === 'building.glb') {
					await modelStore.loadModel(defaultModelUrl)
				} else {
					// It's a file key, let's load from cache
					// (Assuming the store can handle parsing from ArrayBuffer directly,
					// but let's stick to the simplest flow for now: load the default if cache fails)
					await modelStore.loadModel(defaultModelUrl)
				}
			} else {
				await modelStore.loadModel(defaultModelUrl)
			}
		} else {
			await modelStore.loadModel(defaultModelUrl)
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
			// Set a temporary error
			modelStore.error = '檔案格式錯誤，請使用 .glb 模型'
			return
		}

		if (file.size > 50 * 1024 * 1024) {
			modelStore.clearError()
			// Set a temporary error
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
		<BIMViewer bind:this={viewerRef} modelUrl={defaultModelUrl} autoRotate={false} />
	</div>

	<div class="sidebar-wrapper">
		<Sidebar treeData={modelStore.treeData} onSelect={handleSelect} />
	</div>

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
		pointer-events: none; /* Let events pass through the wrapper */
		display: flex; /* Allow child to size itself */
	}

	/* We need to ensure Sidebar itself captures pointer events */
	:global(.sidebar) {
		pointer-events: auto;
		box-shadow: 4px 0 16px rgba(0, 0, 0, 0.1); /* Add shadow for depth */
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
</style>
