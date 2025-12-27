<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity'
	import type { TreeItem } from '$lib/stores/modelCache.svelte'
	import * as Collapsible from '$lib/components/ui/collapsible'
	import TreeView from './TreeView.svelte' // Self-import instead of deprecated svelte:self

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

<ul class="m-0 list-none p-0 ps-4">
	{#each items as item (item.id)}
		<li class="flex flex-col">
			<Collapsible.Root open={expandedIds.has(item.id)}>
				<div
					class="flex cursor-pointer items-center gap-1.5 overflow-hidden rounded px-2 py-1 text-[13px] text-ellipsis whitespace-nowrap text-gray-700 hover:bg-gray-100"
					onclick={() => onSelect(item.id)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && onSelect(item.id)}
				>
					{#if item.children.length > 0}
						<button
							class="flex w-3 items-center justify-center border-none bg-transparent p-0 text-[8px] text-gray-400 transition-transform duration-200"
							class:rotate-90={expandedIds.has(item.id)}
							onclick={(e) => toggleExpand(item.id, e)}
						>
							▶
						</button>
					{:else}
						<span class="w-3"></span>
					{/if}

					<span class="text-sm">
						{#if item.type === 'Group'}
							📁
						{:else if item.type === 'Mesh'}
							📦
						{:else}
							🔹
						{/if}
					</span>

					<span class="flex-1 overflow-hidden text-ellipsis">{item.name}</span>
				</div>

				{#if item.children.length > 0}
					<Collapsible.Content>
						<TreeView items={item.children} {onSelect} level={level + 1} />
					</Collapsible.Content>
				{/if}
			</Collapsible.Root>
		</li>
	{/each}
</ul>
