<script lang="ts">
	/**
	 * @component Sidebar
	 *
	 * 模型結構側邊欄，顯示模型的樹狀結構。
	 *
	 * 功能：
	 * - 顯示模型的階層結構樹
	 * - 支援收合/展開側邊欄
	 * - 提供重置全部可見性功能
	 * - 整合 TreeView 組件顯示節點
	 *
	 * @example
	 * ```svelte
	 * <Sidebar onSelect={handleSelect} />
	 * ```
	 */
	import TreeView from './TreeView.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import * as ScrollArea from '$lib/components/ui/scroll-area'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { Button } from '$lib/components/ui/button'
	import { ChevronLeft, ChevronRight, Eye } from 'lucide-svelte'
	import { fade } from 'svelte/transition'

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
	class="pointer-events-auto fixed left-0 top-0 z-[100] flex h-full w-[350px] flex-col overflow-visible border-r border-border bg-card shadow-[4px_0_16px_rgba(0,0,0,0.1)] transition-[left] duration-300 ease-in-out"
	style:left={isCollapsed ? '-350px' : '0'}
>
	<div
		class="flex min-h-12 items-center border-b border-border px-4 py-3"
		class:justify-between={!isCollapsed}
	>
		{#if !isCollapsed}
			<h2 class="m-0 text-base font-semibold text-foreground">模型結構</h2>
			<div class="flex items-center gap-1">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							variant="ghost"
							size="icon"
							class="h-8 w-8"
							onclick={handleResetVisibility}
							aria-label="重置全部顯示"
						>
							<Eye size={16} />
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>重置全部顯示</p>
					</Tooltip.Content>
				</Tooltip.Root>
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
			</div>
		{/if}
	</div>

	{#if !isCollapsed}
		<ScrollArea.Root class="flex-1 overflow-hidden">
			<div class="h-full p-2">
				{#if enhancedTreeData.length > 0}
					<TreeView items={enhancedTreeData} {onSelect} />
				{:else}
					<div class="p-5 text-center text-sm text-muted-foreground">尚無模型資料</div>
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
				class="rounded-full shadow-lg hover:bg-accent"
				onclick={() => (isCollapsed = !isCollapsed)}
				aria-label="展開側邊欄"
			>
				<ChevronRight size={18} />
			</Button>
		</div>
	{/if}
</aside>
