<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity'
	import type { EnhancedTreeItem } from '$lib/types/bimSettings'
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import BrowseTreeView from './BrowseTreeView.svelte'
	import { FolderOpen, Box, Circle, ChevronRight } from 'lucide-svelte'

	interface Props {
		items: EnhancedTreeItem[]
		onSelect: (id: string) => void
		level?: number
	}

	let { items, onSelect, level = 0 }: Props = $props()
	let expandedIds = new SvelteSet<string>()

	// 獲取當前選中的節點 ID
	const selectedNodeId = $derived(viewerControlStore.selectedNodeId)

	function toggleExpand(id: string, e: MouseEvent) {
		e.stopPropagation()
		if (expandedIds.has(id)) {
			expandedIds.delete(id)
		} else {
			expandedIds.add(id)
		}
	}
</script>

<ul class="m-0 list-none p-0 ps-4">
	{#each items as item (item.id)}
		<li class="flex flex-col">
			<div
				class="flex cursor-pointer items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded px-2 py-1.5 text-[13px] text-foreground transition-all duration-200 hover:bg-primary/10 hover:shadow-sm"
				class:text-primary={selectedNodeId === item.id}
				class:font-medium={selectedNodeId === item.id}
				class:shadow-sm={selectedNodeId === item.id}
				style:background-color={selectedNodeId === item.id ? 'rgb(var(--primary) / 0.15)' : ''}
				onclick={() => onSelect(item.id)}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && onSelect(item.id)}
			>
				{#if item.children.length > 0}
					<button
						class="flex w-6 shrink-0 items-center justify-center border-none bg-transparent p-0 text-muted-foreground transition-transform duration-200 hover:text-foreground"
						class:rotate-90={expandedIds.has(item.id)}
						onclick={(e) => toggleExpand(item.id, e)}
						title={expandedIds.has(item.id) ? '收合' : '展開'}
					>
						<ChevronRight size={14} />
					</button>
				{:else}
					<span class="w-6 shrink-0"></span>
				{/if}

				<span class="shrink-0">
					{#if item.type === 'Group'}
						<FolderOpen size={16} class="text-primary" />
					{:else if item.type === 'Mesh'}
						<Box size={16} class="text-blue-500" />
					{:else}
						<Circle size={14} class="text-muted-foreground" />
					{/if}
				</span>

				<span class="flex-1 overflow-hidden text-ellipsis">{item.displayName}</span>
			</div>

			{#if item.children.length > 0}
				<div
					class="overflow-hidden transition-[max-height] duration-300 ease-in-out"
					style:max-height={expandedIds.has(item.id) ? '3000px' : '0'}
				>
					<div
						class="transition-opacity duration-200"
						class:opacity-0={!expandedIds.has(item.id)}
						class:opacity-100={expandedIds.has(item.id)}
					>
						<BrowseTreeView items={item.children} {onSelect} level={level + 1} />
					</div>
				</div>
			{/if}
		</li>
	{/each}
</ul>
