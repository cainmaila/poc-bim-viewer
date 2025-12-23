<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity'
	import type { TreeItem } from '$lib/stores/modelCache.svelte'

	interface Props {
		items: TreeItem[]
		onSelect: (id: string) => void
		level?: number
	}

	let { items, onSelect, level = 0 }: Props = $props()

	let expandedIds = new SvelteSet<string>()

	function toggleExpand(id: string, e: MouseEvent) {
		e.stopPropagation()
		if (expandedIds.has(id)) {
			expandedIds.delete(id)
		} else {
			expandedIds.add(id)
		}
	}
</script>

<ul class="tree-list" style:--level={level}>
	{#each items as item (item.id)}
		<li class="tree-item">
			<div
				class="item-header"
				onclick={() => onSelect(item.id)}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && onSelect(item.id)}
			>
				{#if item.children.length > 0}
					<button
						class="expand-toggle"
						class:expanded={expandedIds.has(item.id)}
						onclick={(e) => toggleExpand(item.id, e)}
					>
						▶
					</button>
				{:else}
					<span class="spacer"></span>
				{/if}

				<span class="item-icon">
					{#if item.type === 'Group'}
						📁
					{:else if item.type === 'Mesh'}
						📦
					{:else}
						🔹
					{/if}
				</span>

				<span class="item-name">{item.name}</span>
			</div>

			{#if item.children.length > 0 && expandedIds.has(item.id)}
				<svelte:self items={item.children} {onSelect} level={level + 1} />
			{/if}
		</li>
	{/each}
</ul>

<style lang="postcss">
	.tree-list {
		list-style: none;
		padding: 0;
		margin: 0;
		padding-inline-start: 1rem;
	}

	.tree-item {
		display: flex;
		flex-direction: column;
	}

	.item-header {
		display: flex;
		align-items: center;
		padding: 4px 8px;
		cursor: pointer;
		border-radius: 4px;
		gap: 6px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 13px;
		color: #374151;

		&:hover {
			background: #f3f4f6;
		}
	}

	.expand-toggle {
		background: none;
		border: none;
		padding: 0;
		font-size: 8px;
		cursor: pointer;
		color: #9ca3af;
		transition: transform 0.2s;
		width: 12px;
		display: flex;
		align-items: center;
		justify-content: center;

		&.expanded {
			transform: rotate(90deg);
		}
	}

	.spacer {
		width: 12px;
	}

	.item-icon {
		font-size: 14px;
	}

	.item-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
