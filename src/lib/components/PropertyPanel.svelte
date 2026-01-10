<script lang="ts">
	/**
	 * @component PropertyPanel
	 *
	 * 節點屬性編輯面板，用於檢視與修改 BIM 模型節點的屬性。
	 *
	 * 功能：
	 * - 顯示選中節點的類型、名稱、可見性等資訊
	 * - 支援修改節點顯示名稱
	 * - 支援切換節點可見性
	 * - 支援新增、編輯、刪除自定義屬性
	 * - 屬性支援字串、數字、布林三種類型
	 * - 修改後的屬性會持久化到 BIM 設定中
	 *
	 * @example
	 * ```svelte
	 * <PropertyPanel onClearSelection={handleClearSelection} />
	 * ```
	 */
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import * as Button from '$lib/components/ui/button'
	import { X, Eye, EyeOff } from 'lucide-svelte'
	import { fly } from 'svelte/transition'
	import { notify } from '$lib/utils/notify'
	import { inferType } from '$lib/utils/typeHelpers'
	import type { PropertyType } from '$lib/utils/typeHelpers'

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

	// 表單狀態
	let formName = $state('')
	let formVisible = $state(true)
	let formProperties = $state<Record<string, string>>({})
	// 用於追蹤每個屬性的類型 (string, number, boolean)
	let formPropertyTypes = $state<Record<string, PropertyType>>({})

	// 新增屬性狀態
	let isAddingProperty = $state(false)
	let newPropKey = $state('')
	let newPropValue = $state('')
	let newPropType = $state<PropertyType>('string')

	// 當選中的節點 ID 變化時，重置表單
	let previousNodeId: string | null = null
	$effect(() => {
		// console.log('[PropertyPanel] $effect triggered, selectedNodeId:', selectedNodeId)
		const currentNodeId = selectedNodeId
		if (currentNodeId && currentNodeId !== previousNodeId) {
			// console.log('[PropertyPanel] Node changed, resetting form. Old:', previousNodeId, 'New:', currentNodeId)
			previousNodeId = currentNodeId
			// 使用 selectedNode 的值來初始化表單
			if (selectedNode) {
				formName = selectedNode.displayName
				formVisible = selectedNode.visible
				// 複製屬性，避免直接修改引用
				formProperties = { ...selectedNode.properties }

				// 初始化類型
				formPropertyTypes = {}
				for (const [key, value] of Object.entries(formProperties)) {
					formPropertyTypes[key] = inferType(value)
				}

				isAddingProperty = false
				newPropKey = ''
				newPropValue = ''
				newPropType = 'string'
			}
		} else if (!currentNodeId) {
			previousNodeId = null
		}
	})

	// 使用 $effect 管理 body class，優化 DOM 操作
	$effect(() => {
		const bodyElement = document.body
		if (selectedNode) {
			bodyElement.classList.add('property-panel-open')
			return () => bodyElement.classList.remove('property-panel-open')
		} else {
			bodyElement.classList.remove('property-panel-open')
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

	// 新增屬性
	function addProperty() {
		// console.log('[PropertyPanel] addProperty called')
		if (newPropKey.trim()) {
			let finalValue = newPropValue

			// 根據類型處理值
			if (newPropType === 'boolean') {
				// 確保布林值是 "true" 或 "false"
				finalValue = (newPropValue === 'true').toString()
			} else if (newPropType === 'number') {
				// 確保是有效數字
				if (isNaN(Number(newPropValue))) {
					notify.error('請輸入有效的數字')
					return
				}
			}

			formProperties[newPropKey.trim()] = finalValue
			formPropertyTypes[newPropKey.trim()] = newPropType

			// console.log('[PropertyPanel] Added property:', newPropKey.trim(), '=', finalValue)
			newPropKey = ''
			newPropValue = ''
			newPropType = 'string'
			isAddingProperty = false
		}
	}

	// 更新屬性值
	function updateProperty(key: string, value: string) {
		formProperties[key] = value
	}

	// 更新屬性類型
	function updatePropertyType(key: string, type: PropertyType) {
		formPropertyTypes[key] = type

		// 類型切換時的默認值處理
		const currentValue = formProperties[key]
		if (type === 'boolean') {
			if (currentValue !== 'true' && currentValue !== 'false') {
				formProperties[key] = 'false'
			}
		} else if (type === 'number') {
			if (isNaN(Number(currentValue))) {
				formProperties[key] = '0'
			}
		}
	}

	// 刪除屬性
	function deleteProperty(key: string) {
		const newProps = { ...formProperties }
		delete newProps[key]
		formProperties = newProps

		const newTypes = { ...formPropertyTypes }
		delete newTypes[key]
		formPropertyTypes = newTypes
	}

	// 修改按鈕
	async function handleSave() {
		if (!selectedNode) return

		const overrides: import('$lib/types/bimSettings').NodeOverrides = {}

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

		// 處理 properties 覆寫
		if (Object.keys(formProperties).length > 0) {
			overrides.properties = formProperties
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
		class="pointer-events-auto fixed right-0 top-0 z-[1100] flex h-full w-[400px] flex-col border-l border-border bg-card shadow-[-4px_0_16px_rgba(0,0,0,0.1)]"
		transition:fly={{ x: 400, duration: 200 }}
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
						onkeydown={(e) => e.stopPropagation()}
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

				<!-- 自定義屬性 -->
				<div class="space-y-3 pt-2">
					<div class="flex items-center justify-between">
						<div class="text-sm font-medium text-foreground">自定義屬性</div>
					</div>

					<!-- 屬性列表 -->
					<div class="overflow-hidden rounded-md border border-input bg-background">
						<table class="w-full text-sm">
							<thead class="bg-muted/30">
								<tr class="border-b border-border text-left">
									<th class="w-[30%] px-3 py-2 font-medium text-muted-foreground">名稱</th>
									<th class="w-[25%] px-3 py-2 font-medium text-muted-foreground">類型</th>
									<th class="px-3 py-2 font-medium text-muted-foreground">值</th>
									<th class="w-[30px]"></th>
								</tr>
							</thead>
							<tbody>
								{#each Object.entries(formProperties) as [key, value] (key)}
									<tr class="border-b border-border/50 last:border-0 hover:bg-muted/20">
										<!-- Key -->
										<td
											class="max-w-[100px] truncate px-3 py-2 align-middle font-medium text-foreground"
											title={key}>{key}</td
										>

										<!-- Type Selector -->
										<td class="px-2 py-2 align-middle">
											<select
												class="w-full cursor-pointer bg-transparent text-xs focus:outline-none"
												value={formPropertyTypes[key] || 'string'}
												onchange={(e) =>
													updatePropertyType(key, e.currentTarget.value as PropertyType)}
											>
												<option value="string">字串</option>
												<option value="number">數字</option>
												<option value="boolean">布林</option>
											</select>
										</td>

										<!-- Value Input -->
										<td class="px-3 py-2 align-middle">
											{#if formPropertyTypes[key] === 'boolean'}
												<select
													{value}
													onchange={(e) => updateProperty(key, e.currentTarget.value)}
													class="w-full bg-transparent text-foreground focus:outline-none"
												>
													<option value="true">True</option>
													<option value="false">False</option>
												</select>
											{:else if formPropertyTypes[key] === 'number'}
												<input
													type="number"
													{value}
													onblur={(e) => updateProperty(key, e.currentTarget.value)}
													onkeydown={(e) => e.stopPropagation()}
													step="any"
													class="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
													placeholder="0"
												/>
											{:else}
												<input
													type="text"
													{value}
													onblur={(e) => updateProperty(key, e.currentTarget.value)}
													onkeydown={(e) => e.stopPropagation()}
													class="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
													placeholder="輸入..."
												/>
											{/if}
										</td>

										<!-- Delete -->
										<td class="px-1 py-2 text-center align-middle">
											<Button.Button
												variant="ghost"
												size="icon"
												class="h-6 w-6 text-muted-foreground hover:text-destructive"
												onclick={() => deleteProperty(key)}
												title="刪除"
											>
												<X size={14} />
											</Button.Button>
										</td>
									</tr>
								{/each}

								{#if Object.keys(formProperties).length === 0}
									<tr>
										<td colspan="4" class="py-6 text-center text-xs text-muted-foreground">
											尚無自定義屬性，請點擊下方新增
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>

					<!-- 新增屬性表單 -->
					<div class="rounded-md border border-dashed border-border p-2">
						{#if isAddingProperty}
							<div class="space-y-2">
								<div class="flex gap-2">
									<input
										type="text"
										bind:value={newPropKey}
										placeholder="屬性名稱"
										onkeydown={(e) => e.stopPropagation()}
										class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
									/>
									<select
										bind:value={newPropType}
										class="w-[80px] rounded-md border border-input bg-background px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
									>
										<option value="string">字串</option>
										<option value="number">數字</option>
										<option value="boolean">布林</option>
									</select>
								</div>

								{#if newPropType === 'boolean'}
									<select
										bind:value={newPropValue}
										class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
									>
										<option value="" disabled selected>選擇布林值</option>
										<option value="true">True</option>
										<option value="false">False</option>
									</select>
								{:else if newPropType === 'number'}
									<input
										type="number"
										bind:value={newPropValue}
										placeholder="輸入數值"
										onkeydown={(e) => e.stopPropagation()}
										step="any"
										class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
									/>
								{:else}
									<input
										type="text"
										bind:value={newPropValue}
										placeholder="輸入字串值"
										onkeydown={(e) => e.stopPropagation()}
										class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
									/>
								{/if}

								<div class="flex gap-2">
									<Button.Button
										variant="ghost"
										size="sm"
										class="h-7 flex-1"
										onclick={() => (isAddingProperty = false)}
									>
										取消
									</Button.Button>
									<Button.Button
										variant="secondary"
										size="sm"
										class="h-7 flex-1"
										disabled={!newPropKey.trim() ||
											(newPropType === 'boolean' && !newPropValue) ||
											(newPropType === 'number' && newPropValue === '')}
										onclick={addProperty}
									>
										確認
									</Button.Button>
								</div>
							</div>
						{:else}
							<Button.Button
								variant="ghost"
								size="sm"
								class="h-7 w-full text-xs text-muted-foreground"
								onclick={() => {
									isAddingProperty = true
									newPropKey = ''
									newPropValue = ''
									newPropType = 'string'
								}}
							>
								+ 新增屬性
							</Button.Button>
						{/if}
					</div>
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
