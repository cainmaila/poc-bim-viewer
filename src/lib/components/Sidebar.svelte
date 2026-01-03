<script lang="ts">
	import TreeView from './TreeView.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import * as ScrollArea from '$lib/components/ui/scroll-area'
	import { Button } from '$lib/components/ui/button'
	import { ChevronLeft, ChevronRight, Eye } from 'lucide-svelte'

	interface Props {
		onSelect: (id: string) => void
	}

	let { onSelect }: Props = $props()
	let isCollapsed = $state(false)

	// Use enhanced tree data from BIM settings store
	const enhancedTreeData = $derived(bimSettingsStore.enhancedTreeData)

	async function handleResetVisibility() {
		await bimSettingsStore.resetAllVisibility()
	}
</script>

<aside
	class="pointer-events-auto z-[100] flex h-full flex-col overflow-hidden border-r border-border bg-card shadow-[4px_0_16px_rgba(0,0,0,0.1)] transition-all duration-300"
	class:w-[300px]={!isCollapsed}
	class:w-12={isCollapsed}
>
	<div class="flex min-h-12 items-center justify-between border-b border-border px-4 py-3">
		{#if !isCollapsed}
			<h2 class="m-0 text-base font-semibold text-foreground">模型結構</h2>
			<div class="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8"
					onclick={handleResetVisibility}
					aria-label="重置全部顯示"
					title="重置全部顯示"
				>
					<Eye size={16} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8"
					onclick={() => (isCollapsed = !isCollapsed)}
					aria-label="Toggle Sidebar"
				>
					<ChevronLeft size={18} />
				</Button>
			</div>
		{:else}
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8"
				onclick={() => (isCollapsed = !isCollapsed)}
				aria-label="Toggle Sidebar"
			>
				<ChevronRight size={18} />
			</Button>
		{/if}
	</div>

	{#if !isCollapsed}
		<ScrollArea.Root class="flex-1">
			<div class="p-2">
				{#if enhancedTreeData.length > 0}
					<TreeView items={enhancedTreeData} {onSelect} />
				{:else}
					<div class="p-5 text-center text-sm text-muted-foreground">尚無模型資料</div>
				{/if}
			</div>
		</ScrollArea.Root>
	{/if}
</aside>
