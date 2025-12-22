<script lang="ts">
	import BIMViewer from '$lib/components/BIMViewer.svelte'
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { base } from '$app/paths'

	const modelUrl = `${base}/building.glb`
</script>

<div class="viewer-container">
	<BIMViewer {modelUrl} autoRotate={false} />

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
			<button class="retry-button" onclick={() => modelStore.loadModel(modelUrl)}> 重試 </button>
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
</style>
