<script lang="ts">
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import * as Button from '$lib/components/ui/button'
	import { X, Box, FolderOpen } from 'lucide-svelte'
	import { fly } from 'svelte/transition'

	interface TreeNode {
		id: string
		displayName: string
		originalName: string
		visible: boolean
		path: string
		type: string
		properties: Record<string, string>
		children?: TreeNode[]
	}

	interface Props {
		onClearSelection?: () => void
	}

	let { onClearSelection }: Props = $props()

	// 獲取選中的節點 ID
	const selectedNodeId = $derived(viewerControlStore.selectedNodeId)

	// 根據選中的節點 ID 找到對應的節點資料
	const selectedNode = $derived.by(() => {
		if (!selectedNodeId) return null

		// 從 enhancedTreeData 中遞迴查找節點
		function findNodeById(items: TreeNode[], id: string): TreeNode | null {
			for (const item of items) {
				if (item.id === id) return item
				if (item.children && item.children.length > 0) {
					const found = findNodeById(item.children, id)
					if (found) return found
				}
			}
			return null
		}

		return findNodeById(bimSettingsStore.enhancedTreeData, selectedNodeId)
	})

	// 關閉面板（取消選取）
	function handleClose() {
		onClearSelection?.()
	}
</script>

{#if selectedNode}
	<aside
		class="pointer-events-auto fixed right-0 top-0 z-[110] flex h-full w-[350px] flex-col border-l border-border bg-gradient-to-br from-card via-card to-card/95 shadow-[-4px_0_24px_rgba(0,0,0,0.15)] backdrop-blur-sm"
		transition:fly={{ x: 300, duration: 250 }}
	>
		<!-- 標題列 -->
		<div
			class="flex min-h-14 items-center justify-between border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4"
		>
			<div class="flex items-center gap-2">
				{#if selectedNode.type === 'Group'}
					<FolderOpen size={20} class="text-primary" />
				{:else if selectedNode.type === 'Mesh'}
					<Box size={20} class="text-primary" />
				{/if}
				<h2 class="m-0 text-base font-semibold text-foreground">節點資訊</h2>
			</div>
			<Button.Button
				variant="ghost"
				size="icon"
				class="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
				onclick={handleClose}
			>
				<X size={18} />
			</Button.Button>
		</div>

		<!-- 內容區域 -->
		<div class="flex-1 overflow-y-auto p-5">
			<div class="space-y-5">
				<!-- 節點名稱 -->
				<div
					class="rounded-lg border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4 shadow-sm"
				>
					<div class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						名稱
					</div>
					<div class="text-lg font-semibold text-foreground">{selectedNode.displayName}</div>
				</div>

				<!-- 自定義屬性 -->
				{#if selectedNode.properties && Object.keys(selectedNode.properties).length > 0}
					<div class="rounded-lg border border-border/50 bg-background/50 p-4 shadow-sm">
						<div class="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
							屬性
						</div>
						<div class="space-y-2">
							{#each Object.entries(selectedNode.properties) as [key, value] (key)}
								<div class="flex flex-col gap-1 rounded-md bg-muted/30 p-2 text-sm">
									<span class="font-medium text-foreground">{key}</span>
									<span class="break-all text-muted-foreground">{value}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- 原始名稱（如果與顯示名稱不同）- 保持隱藏以求簡潔，或者視需要保留 -->
				{#if selectedNode.originalName !== selectedNode.displayName}
					<div class="rounded-lg border border-border/50 bg-muted/30 p-4">
						<div class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
							原始名稱
						</div>
						<div class="font-mono text-sm text-muted-foreground">
							{selectedNode.originalName}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</aside>
{/if}
