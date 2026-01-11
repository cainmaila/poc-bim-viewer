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

				<!-- 節點類型 -->
				<div class="rounded-lg border border-border/50 bg-background/50 p-4 shadow-sm">
					<div class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						類型
					</div>
					<div class="flex items-center gap-2">
						<span
							class="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
						>
							{selectedNode.type}
						</span>
					</div>
				</div>

				<!-- 可見性狀態 -->
				<div class="rounded-lg border border-border/50 bg-background/50 p-4 shadow-sm">
					<div class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						可見性
					</div>
					<div class="flex items-center gap-2">
						{#if selectedNode.visible}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400"
							>
								<span class="h-2 w-2 rounded-full bg-green-500"></span>
								顯示中
							</span>
						{:else}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400"
							>
								<span class="h-2 w-2 rounded-full bg-gray-500"></span>
								已隱藏
							</span>
						{/if}
					</div>
				</div>

				<!-- 原始名稱（如果與顯示名稱不同） -->
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

				<!-- 節點路徑 -->
				<div class="rounded-lg border border-border/50 bg-muted/30 p-4">
					<div class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						節點路徑
					</div>
					<div class="break-all font-mono text-xs leading-relaxed text-muted-foreground">
						{selectedNode.path}
					</div>
				</div>

				<!-- 瀏覽模式提示 -->
				<div class="rounded-lg border border-primary/20 bg-primary/5 p-4">
					<div class="text-xs text-muted-foreground">
						💡 您目前處於瀏覽模式，無法編輯節點屬性。若需編輯，請切換至編輯模式。
					</div>
				</div>
			</div>
		</div>
	</aside>
{/if}
