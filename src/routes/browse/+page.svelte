<script lang="ts">
	import BIMViewer from '$lib/components/BIMViewer.svelte'
	import BrowseSidebar from '$lib/components/BrowseSidebar.svelte'
	import BrowsePropertyPanel from '$lib/components/BrowsePropertyPanel.svelte'
	import SettingsMenu from '$lib/components/SettingsMenu.svelte'
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import * as Button from '$lib/components/ui/button'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { settingsStore } from '$lib/stores/settings.svelte'
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import { onMount } from 'svelte'
	import { getActiveModelKey, getModelFromCache } from '$lib/utils/database'
	import { Box, TriangleAlert, RefreshCw, Edit3 } from 'lucide-svelte'
	import { goto } from '$app/navigation'
	import { base } from '$app/paths'

	let viewerRef = $state<ReturnType<typeof BIMViewer>>()
	let showFPSNotification = $state(false)
	let needsReload = $state(false)

	onMount(async () => {
		try {
			const activeKey = await getActiveModelKey()
			if (activeKey) {
				const cachedData = await getModelFromCache(activeKey)
				if (cachedData) {
					// 從緩存載入模型
					await modelStore.loadModelFromCache(activeKey)
				}
			}

			// 監聽 FPS 模式變化
			const eventBus = viewerRef?.getEventBus()
			if (eventBus) {
				eventBus.on('fps:modeChanged', (data: { enabled: boolean }) => {
					// 同步更新 settingsStore（如果 FPS 模式是從其他地方觸發的）
					settingsStore.fpsMode = data.enabled

					// 進入 FPS 模式時顯示提示
					if (data.enabled) {
						showFPSNotification = true
						// 3 秒後自動隱藏
						setTimeout(() => {
							showFPSNotification = false
						}, 3000)
					}
				})
			}
		} catch (error) {
			console.error('[Browse] Initialization error:', error)
			modelStore.error =
				error instanceof Error ? `初始化失敗: ${error.message}` : '初始化失敗，請重新整理頁面'
		}
	})

	function handleSelect(id: string) {
		viewerRef?.flyTo(id)
		// 設置選中的節點
		viewerControlStore.setSelectedNode(id)
	}

	function handleClearSelection() {
		viewerRef?.clearSelection()
	}

	function handleSwitchToEdit() {
		goto(`${base}/`)
	}
</script>

<div
	class="fixed inset-0 overflow-hidden bg-background"
	role="region"
	aria-label="BIM Viewer - Browse Mode"
>
	<div class="absolute inset-0 z-0">
		<BIMViewer bind:this={viewerRef} autoRotate={false} />
		{#if !modelStore.model && !modelStore.isLoading}
			<div class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
				<div
					class="max-w-md rounded-3xl border border-border/30 bg-card/70 p-12 text-center shadow-xl backdrop-blur-lg"
				>
					<Box size={64} class="mb-6 text-muted-foreground opacity-80" />
					<h3 class="mb-3 text-2xl font-semibold text-foreground">尚未載入模型</h3>
					<p class="m-0 mb-6 leading-relaxed text-muted-foreground">
						請切換至編輯模式載入 .glb 檔案
					</p>
					<Button.Button onclick={handleSwitchToEdit} class="gap-2">
						<Edit3 size={16} />
						切換至編輯模式
					</Button.Button>
				</div>
			</div>
		{/if}
	</div>

	{#if !settingsStore.fpsMode}
		<div class="pointer-events-none absolute bottom-0 left-0 top-0 z-10 flex">
			<BrowseSidebar onSelect={handleSelect} />
		</div>

		<div class="pointer-events-none absolute bottom-0 right-0 top-0 z-10 flex">
			<BrowsePropertyPanel onClearSelection={handleClearSelection} />
		</div>

		<SettingsMenu bind:needsReload />

		<!-- 切換到編輯模式按鈕 -->
		<div class="pointer-events-none absolute left-0 right-0 top-4 z-[90] flex justify-center">
			<Button.Button
				onclick={handleSwitchToEdit}
				variant="outline"
				class="pointer-events-auto gap-2 border-primary/30 bg-card/90 shadow-lg backdrop-blur-sm hover:bg-card"
			>
				<Edit3 size={16} />
				切換至編輯模式
			</Button.Button>
		</div>
	{/if}

	{#if showFPSNotification}
		<div
			class="pointer-events-none absolute left-1/2 top-8 z-[10000] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-6 py-3 font-semibold text-primary shadow-xl backdrop-blur-sm"
		>
			<span>按 ESC 鍵退出 FPS 模式</span>
		</div>
	{/if}

	{#if needsReload}
		<div
			class="pointer-events-none absolute inset-0 z-[8000] flex items-end justify-center bg-black/30 backdrop-blur-[2px]"
		>
			<div
				class="mb-8 flex items-center gap-3 rounded-full border border-amber-400/40 bg-amber-900/80 px-6 py-3 text-amber-100 shadow-2xl"
			>
				<RefreshCw size={20} class="animate-spin" style="animation-duration: 3s" />
				<span class="font-medium">設定已變更，請重新整理頁面以套用</span>
			</div>
		</div>
	{/if}

	{#if modelStore.isLoading}
		<LoadingOverlay
			isLoading={true}
			progress={modelStore.loadProgress}
			fromCache={modelStore.fromCache}
		/>
	{/if}

	{#if modelStore.error}
		<Alert.Root
			variant="destructive"
			class="absolute left-1/2 top-8 z-[10000] flex max-w-md -translate-x-1/2 flex-col items-center gap-4 shadow-xl"
		>
			<TriangleAlert size={32} />
			<Alert.Description class="text-center text-base leading-relaxed">
				{modelStore.error}
			</Alert.Description>
			<button
				class="rounded bg-card px-6 py-2 font-semibold text-destructive transition-all hover:-translate-y-px hover:bg-card/80 active:translate-y-0"
				onclick={() => modelStore.clearError()}
			>
				清除錯誤
			</button>
		</Alert.Root>
	{/if}
</div>
