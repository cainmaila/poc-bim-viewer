<script lang="ts">
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import * as Button from '$lib/components/ui/button'
	import {
		X,
		Box,
		FolderOpen,
		Type,
		Hash,
		ToggleLeft,
		ToggleRight,
		CheckCircle2,
		XCircle,
		AlertCircle
	} from 'lucide-svelte'
	import { fly } from 'svelte/transition'
	import { inferType } from '$lib/utils/typeHelpers'

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
		class="pointer-events-auto fixed right-0 top-0 z-[110] flex h-full w-[360px] flex-col border-l border-border bg-gradient-to-br from-card via-card to-card/95 shadow-[-4px_0_24px_rgba(0,0,0,0.15)] backdrop-blur-sm"
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
			<div class="space-y-6">
				<!-- 節點名稱 -->
				<div
					class="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-primary/10 via-background to-transparent p-5 shadow-sm"
				>
					<div
						class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/80"
					>
						<Box size={14} />
						Node Name
					</div>
					<div class="text-xl font-bold tracking-tight text-foreground">
						{selectedNode.displayName}
					</div>
					<!-- 裝飾背景 -->
					<div
						class="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl"
					></div>
				</div>

				<!-- 自定義屬性 -->
				{#if selectedNode.properties && Object.keys(selectedNode.properties).length > 0}
					<div class="space-y-3">
						<div
							class="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground"
						>
							<AlertCircle size={14} />
							Custom Properties
						</div>

						<div class="grid grid-cols-1 gap-3">
							{#each Object.entries(selectedNode.properties) as [key, value] (key)}
								{@const type = inferType(value)}

								<!-- String Card -->
								{#if type === 'string'}
									<div
										class="group relative overflow-hidden rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
									>
										<div
											class="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground"
										>
											<Type size={14} class="text-blue-500" />
											{key}
										</div>
										<div class="pl-6 text-sm font-medium leading-relaxed text-foreground/90">
											{value}
										</div>
										<div
											class="absolute inset-y-0 left-0 w-1 bg-blue-500/10 transition-colors group-hover:bg-blue-500"
										></div>
									</div>

									<!-- Number Card -->
								{:else if type === 'number'}
									<div
										class="group relative overflow-hidden rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
									>
										<div class="flex items-center justify-between">
											<div
												class="flex items-center gap-2 text-xs font-medium text-muted-foreground"
											>
												<Hash size={14} class="text-amber-500" />
												{key}
											</div>
											<div
												class="font-mono text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400"
											>
												{value}
											</div>
										</div>
										<div
											class="absolute inset-y-0 left-0 w-1 bg-amber-500/10 transition-colors group-hover:bg-amber-500"
										></div>
									</div>

									<!-- Boolean Card -->
								{:else if type === 'boolean'}
									{@const isTrue = String(value).toLowerCase() === 'true'}
									<div
										class="group relative overflow-hidden rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
									>
										<div class="flex items-center justify-between">
											<div
												class="flex items-center gap-2 text-xs font-medium text-muted-foreground"
											>
												{#if isTrue}
													<ToggleRight size={14} class="text-emerald-500" />
												{:else}
													<ToggleLeft size={14} class="text-rose-500" />
												{/if}
												{key}
											</div>
											<div class="flex items-center gap-1.5">
												{#if isTrue}
													<span
														class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400"
													>
														<CheckCircle2 size={12} />
														Active
													</span>
												{:else}
													<span
														class="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold uppercase text-rose-600 dark:text-rose-400"
													>
														<XCircle size={12} />
														Inactive
													</span>
												{/if}
											</div>
										</div>
										<div
											class="absolute inset-y-0 left-0 w-1 transition-colors"
											class:bg-emerald-500={isTrue}
											class:bg-rose-500={!isTrue}
											class:group-hover:bg-emerald-600={isTrue}
											class:group-hover:bg-rose-600={!isTrue}
										></div>
										<div
											class="absolute inset-y-0 left-0 w-1 opacity-20"
											class:bg-emerald-500={isTrue}
											class:bg-rose-500={!isTrue}
										></div>
									</div>
								{/if}
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
