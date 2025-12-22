<script lang="ts">
	interface Props {
		isLoading: boolean
		progress: number
		fromCache?: boolean
	}

	let { isLoading, progress, fromCache = false }: Props = $props()
</script>

{#if isLoading}
	<div class="overlay">
		<div class="content">
			<div class="spinner"></div>

			<div class="progress-bar">
				<div class="progress-fill" style="width: {progress}%"></div>
			</div>

			<div class="progress-text">{progress}%</div>

			<div class="status-text">
				{fromCache ? '從緩存讀取中...' : '載入模型中...'}
			</div>
		</div>
	</div>
{/if}

<style lang="postcss">
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		backdrop-filter: blur(4px);
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		min-width: 300px;
	}

	.spinner {
		width: 60px;
		height: 60px;
		border: 4px solid rgba(255, 255, 255, 0.2);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #22c55e);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 2rem;
		font-weight: bold;
		color: #fff;
		font-variant-numeric: tabular-nums;
	}

	.status-text {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.8);
		text-align: center;
	}
</style>
