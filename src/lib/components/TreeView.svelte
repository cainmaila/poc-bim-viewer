<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity'
	import type { EnhancedTreeItem } from '$lib/types/bimSettings'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import TreeView from './TreeView.svelte' // Self-import instead of deprecated svelte:self
	import { FolderOpen, Box, Circle, ChevronRight, Pencil, Eye, EyeOff } from 'lucide-svelte'

	interface Props {
		items: EnhancedTreeItem[]
		onSelect: (id: string) => void
		level?: number
		parentVisible?: boolean // 父節點是否可見
	}

	let { items, onSelect, level = 0, parentVisible = true }: Props = $props()
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

	async function toggleVisibility(item: EnhancedTreeItem, e: MouseEvent) {
		e.stopPropagation()
		await bimSettingsStore.setNodeOverride(item.path, { visible: !item.visible })
	}
</script>

<ul class="m-0 list-none p-0 ps-4">
	{#each items as item (item.id)}
		<li class="flex flex-col">
			<div
				class="flex cursor-pointer items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded px-2 py-1 text-[13px] text-foreground transition-colors duration-150 hover:bg-accent/20"
				class:opacity-50={!item.visible || !parentVisible}
				class:bg-accent={selectedNodeId === item.id}
				class:text-accent-foreground={selectedNodeId === item.id}
				class:ring-1={selectedNodeId === item.id}
				class:ring-accent={selectedNodeId === item.id}
				onclick={() => onSelect(item.id)}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && onSelect(item.id)}
			>
				{#if item.children.length > 0}
					<button
						class="flex w-6 shrink-0 items-center justify-center border-none bg-transparent p-0 text-muted-foreground transition-transform duration-200"
						class:rotate-90={expandedIds.has(item.id)}
						onclick={(e) => toggleExpand(item.id, e)}
						title={expandedIds.has(item.id) ? '收合' : '展開'}
					>
						<ChevronRight size={12} />
					</button>
				{:else}
					<span class="w-6 shrink-0"></span>
				{/if}

				<span class="shrink-0">
					{#if item.type === 'Group'}
						<FolderOpen size={16} class="text-accent" />
					{:else if item.type === 'Mesh'}
						<Box size={16} class="text-primary" />
					{:else}
						<Circle size={14} class="text-muted-foreground" />
					{/if}
				</span>

				<span class="flex-1 overflow-hidden text-ellipsis">{item.displayName}</span>

				{#if item.hasOverrides}
					<span class="shrink-0 text-xs text-accent" title="已自訂屬性">
						<Pencil size={12} />
					</span>
				{/if}

				<!-- 可見性切換按鈕 -->
				<button
					class="shrink-0 border-none bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground"
					class:text-foreground={item.visible}
					class:text-muted-foreground={!item.visible}
					onclick={(e) => toggleVisibility(item, e)}
					title={item.visible ? '點擊隱藏' : '點擊顯示'}
				>
					{#if item.visible}
						<Eye size={14} />
					{:else}
						<EyeOff size={14} />
					{/if}
				</button>
			</div>

			{#if item.children.length > 0 && item.visible}
				<div
					class="overflow-hidden transition-[max-height] duration-200 ease-in-out"
					style:max-height={expandedIds.has(item.id) ? '2000px' : '0'}
				>
					<div
						class="transition-transform duration-200 ease-in-out"
						class:-translate-x-full={!expandedIds.has(item.id)}
					>
						<TreeView
							items={item.children}
							{onSelect}
							level={level + 1}
							parentVisible={parentVisible && item.visible}
						/>
					</div>
				</div>
			{/if}
		</li>
	{/each}
</ul>
