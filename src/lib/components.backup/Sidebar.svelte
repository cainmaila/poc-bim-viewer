<script lang="ts">
	import TreeView from './TreeView.svelte'
	import type { TreeItem } from '$lib/stores/modelCache.svelte'

	interface Props {
		treeData: TreeItem[]
		onSelect: (id: string) => void
	}

	let { treeData, onSelect }: Props = $props()
	let isCollapsed = $state(false)
</script>

<aside class="sidebar" class:collapsed={isCollapsed}>
	<div class="sidebar-header">
		{#if !isCollapsed}
			<h2 class="title">模型結構</h2>
		{/if}
		<button
			class="toggle-btn"
			onclick={() => (isCollapsed = !isCollapsed)}
			aria-label="Toggle Sidebar"
		>
			{isCollapsed ? '➡️' : '⬅️'}
		</button>
	</div>

	{#if !isCollapsed}
		<div class="sidebar-content">
			{#if treeData.length > 0}
				<TreeView items={treeData} {onSelect} />
			{:else}
				<div class="empty-state">尚無模型資料</div>
			{/if}
		</div>
	{/if}
</aside>

<style lang="postcss">
	.sidebar {
		width: 300px;
		height: 100%;
		background: white;
		border-right: 1px solid #e5e7eb;
		display: flex;
		flex-direction: column;
		transition: width 0.3s ease;
		z-index: 100;
		overflow: hidden;

		&.collapsed {
			width: 48px;
		}
	}

	.sidebar-header {
		padding: 12px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #f3f4f6;
		min-height: 48px;
	}

	.title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #111827;
	}

	.toggle-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;

		&:hover {
			background: #f3f4f6;
		}
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 8px;

		&::-webkit-scrollbar {
			width: 4px;
		}
		&::-webkit-scrollbar-track {
			background: transparent;
		}
		&::-webkit-scrollbar-thumb {
			background: #d1d5db;
			border-radius: 2px;
		}
	}

	.empty-state {
		padding: 20px;
		text-align: center;
		color: #9ca3af;
		font-size: 14px;
	}
</style>
