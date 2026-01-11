<script lang="ts">
	import BrowseTreeView from './BrowseTreeView.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import { filterTreeForBrowseMode } from '$lib/utils/browseTreeFilter'
	import * as ScrollArea from '$lib/components/ui/scroll-area'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { Button } from '$lib/components/ui/button'
	import { ChevronLeft, ChevronRight } from 'lucide-svelte'
	import { fade } from 'svelte/transition'

	interface Props {
		onSelect: (id: string) => void
	}

	let { onSelect }: Props = $props()
	let isCollapsed = $state(false)

	// Use enhanced tree data from BIM settings store and filter for browse mode
	const filteredTreeData = $derived(filterTreeForBrowseMode(bimSettingsStore.enhancedTreeData))
</script>

<aside
	class="pointer-events-auto fixed left-0 top-0 z-[100] flex h-full w-[350px] flex-col overflow-visible border-r border-border bg-gradient-to-br from-card via-card to-card/95 shadow-[4px_0_16px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-[left] duration-300 ease-in-out"
	style:left={isCollapsed ? '-350px' : '0'}
>
	<div
		class="flex min-h-12 items-center border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3"
		class:justify-between={!isCollapsed}
	>
		{#if !isCollapsed}
			<h2 class="m-0 text-base font-semibold text-foreground">瀏覽模式</h2>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={() => (isCollapsed = !isCollapsed)}
						aria-label="收合側邊欄"
					>
						<ChevronLeft size={18} />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>收合側邊欄</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}
	</div>

	{#if !isCollapsed}
		<ScrollArea.Root class="flex-1 overflow-hidden">
			<div class="h-full p-2">
				{#if filteredTreeData.length > 0}
					<BrowseTreeView items={filteredTreeData} {onSelect} />
				{:else}
					<div class="flex flex-col items-center justify-center p-8 text-center">
						<div class="mb-3 text-4xl opacity-30">📭</div>
						<p class="m-0 text-sm text-muted-foreground">尚無可顯示的節點</p>
						<p class="mt-2 text-xs text-muted-foreground/70">請在編輯模式中設定節點屬性</p>
					</div>
				{/if}
			</div>
		</ScrollArea.Root>
	{/if}

	<!-- 收合時的展開按鈕，固定在螢幕左側邊緣 -->
	{#if isCollapsed}
		<div class="fixed left-4 top-3 z-[101]" transition:fade={{ duration: 200 }}>
			<Button
				variant="outline"
				size="icon"
				class="rounded-full shadow-lg hover:bg-accent hover:shadow-xl"
				onclick={() => (isCollapsed = !isCollapsed)}
				aria-label="展開側邊欄"
			>
				<ChevronRight size={18} />
			</Button>
		</div>
	{/if}
</aside>
