<script lang="ts">
	import TreeView from './TreeView.svelte'
	import type { TreeItem } from '$lib/stores/modelCache.svelte'
	import * as ScrollArea from '$lib/components/ui/scroll-area'
	import { ChevronLeft, ChevronRight } from 'lucide-svelte'

	interface Props {
		treeData: TreeItem[]
		onSelect: (id: string) => void
	}

	let { treeData, onSelect }: Props = $props()
	let isCollapsed = $state(false)
</script>

<aside
	class="pointer-events-auto z-[100] flex h-full flex-col overflow-hidden border-r border-border bg-card shadow-[4px_0_16px_rgba(0,0,0,0.1)] transition-all duration-300"
	class:w-[300px]={!isCollapsed}
	class:w-12={isCollapsed}
>
	<div class="flex min-h-12 items-center justify-between border-b border-border px-4 py-3">
		{#if !isCollapsed}
			<h2 class="m-0 text-base font-semibold text-foreground">模型結構</h2>
		{/if}
		<button
			class="flex items-center justify-center rounded p-1 transition-colors hover:bg-accent/10"
			onclick={() => (isCollapsed = !isCollapsed)}
			aria-label="Toggle Sidebar"
		>
			{#if isCollapsed}
				<ChevronRight size={18} />
			{:else}
				<ChevronLeft size={18} />
			{/if}
		</button>
	</div>

	{#if !isCollapsed}
		<ScrollArea.Root class="flex-1">
			<div class="p-2">
				{#if treeData.length > 0}
					<TreeView items={treeData} {onSelect} />
				{:else}
					<div class="p-5 text-center text-sm text-muted-foreground">尚無模型資料</div>
				{/if}
			</div>
		</ScrollArea.Root>
	{/if}
</aside>
