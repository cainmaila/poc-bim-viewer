<script lang="ts">
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import * as Button from '$lib/components/ui/button'
	import { X, Eye, EyeOff } from 'lucide-svelte'
	import { fly } from 'svelte/transition'
	import { notify } from '$lib/utils/notify'

	interface TreeNode {
		id: string
		displayName: string
		originalName: string
		visible: boolean
		path: string
		type: string
		menu?: 'root' | 'disabled' | 'hide'
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

	// 表單狀態
	let formName = $state('')
	let formVisible = $state(true)
	let formMenu = $state<'root' | 'disabled' | 'hide' | undefined>(undefined)

	// 當選中的節點變化時，重置表單
	$effect(() => {
		if (selectedNode) {
			formName = selectedNode.displayName
			formVisible = selectedNode.visible
			formMenu = selectedNode.menu
		}
	})

	// 關閉面板（取消選取）
	function handleClose() {
		onClearSelection?.()
	}

	// 取消按鈕
	function handleCancel() {
		onClearSelection?.()
	}

	// 修改按鈕
	async function handleSave() {
		if (!selectedNode) return

		const overrides: Record<string, string | boolean> = {}

		// 處理 displayName 覆寫
		// 如果 formName 不為空且與 originalName 不同，則設置覆寫
		if (formName.trim() !== '' && formName !== selectedNode.originalName) {
			overrides.displayName = formName
		}
		// 如果留空或改回 originalName，則不加入 overrides（表示使用預設）

		// 處理 visible 覆寫
		// 預設值是 true，只有當設為 false 時才需要覆寫
		if (formVisible === false) {
			overrides.visible = false
		}
		// 如果是 true，則不加入 overrides（表示使用預設）

		// 處理 menu 覆寫
		if (formMenu !== undefined) {
			overrides.menu = formMenu
		}

		// 先刪除舊的覆寫，然後設置新的（如果有）
		// 這樣可以確保舊的屬性不會殘留
		await bimSettingsStore.removeNodeOverride(selectedNode.path)

		if (Object.keys(overrides).length > 0) {
			// 如果有新的覆寫，則設置
			await bimSettingsStore.setNodeOverride(selectedNode.path, overrides)
		}

		// 顯示修改成功通知
		notify.success('屬性修改成功')

		// 保存後不關閉視窗，讓用戶可以繼續編輯
	}
</script>

{#if selectedNode}
	<aside
		class="pointer-events-auto fixed right-0 top-0 z-[110] flex h-full w-[300px] flex-col border-l border-border bg-card shadow-[-4px_0_16px_rgba(0,0,0,0.1)]"
		transition:fly={{ x: 300, duration: 200 }}
	>
		<!-- 標題列 -->
		<div class="flex min-h-12 items-center justify-between border-b border-border px-4 py-3">
			<h2 class="m-0 text-base font-semibold text-foreground">節點屬性</h2>
			<Button.Button variant="ghost" size="icon" class="h-8 w-8" onclick={handleClose}>
				<X size={18} />
			</Button.Button>
		</div>

		<!-- 表單內容 -->
		<div class="flex-1 overflow-y-auto p-4">
			<div class="space-y-4">
				<!-- 節點類型提示 -->
				<div class="rounded-md bg-muted/50 p-3">
					<div class="text-xs text-muted-foreground">節點類型</div>
					<div class="mt-1 font-medium text-foreground">{selectedNode.type}</div>
				</div>

				<!-- Name 輸入框 -->
				<div class="space-y-2">
					<label for="node-name" class="text-sm font-medium text-foreground">名稱</label>
					<input
						id="node-name"
						type="text"
						bind:value={formName}
						placeholder={selectedNode.originalName}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
					/>
					<div class="text-xs text-muted-foreground">
						留空則使用預設名稱：{selectedNode.originalName}
					</div>
				</div>

				<!-- Visible 切換 -->
				<div class="space-y-2">
					<div class="text-sm font-medium text-foreground">可見性</div>
					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={() => (formVisible = !formVisible)}
							class="flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
							class:text-foreground={formVisible}
							class:text-muted-foreground={!formVisible}
							aria-label={formVisible ? '點擊隱藏節點' : '點擊顯示節點'}
						>
							{#if formVisible}
								<Eye size={16} />
								<span>顯示</span>
							{:else}
								<EyeOff size={16} />
								<span>隱藏</span>
							{/if}
						</button>
					</div>
				</div>

				<!-- Menu 模式選擇 -->
				<div class="space-y-2">
					<div class="text-sm font-medium text-foreground">瀏覽模式顯示</div>
					<select
						bind:value={formMenu}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
					>
						<option value={undefined}>預設（正常顯示）</option>
						<option value="root">設為根節點</option>
						<option value="hide">隱藏此節點（保留子節點）</option>
						<option value="disabled">隱藏此節點及子節點</option>
					</select>
					<div class="text-xs text-muted-foreground">控制此節點在瀏覽模式中的顯示方式</div>
				</div>

				<!-- 節點路徑 (調試用，可選) -->
				<div class="rounded-md bg-muted/30 p-3">
					<div class="text-xs text-muted-foreground">節點路徑</div>
					<div class="mt-1 break-all font-mono text-xs text-muted-foreground">
						{selectedNode.path}
					</div>
				</div>
			</div>
		</div>

		<!-- 操作按鈕 -->
		<div class="flex gap-2 border-t border-border p-4">
			<Button.Button variant="outline" class="flex-1" onclick={handleCancel}>取消</Button.Button>
			<Button.Button variant="default" class="flex-1" onclick={handleSave}>修改</Button.Button>
		</div>
	</aside>
{/if}
