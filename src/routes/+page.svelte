<script lang="ts">
	import BIMViewer from '$lib/components/BIMViewer.svelte'
	import Sidebar from '$lib/components/Sidebar.svelte'
	import SettingsMenu from '$lib/components/SettingsMenu.svelte'
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { onMount } from 'svelte'
	import { getActiveModelKey, getModelFromCache } from '$lib/utils/indexedDBCache'
	import { Box, TriangleAlert } from 'lucide-svelte'

	let isDragOver = $state(false)
	let viewerRef = $state<ReturnType<typeof BIMViewer>>()
	let fpsMode = $state(false)
	let showFPSNotification = $state(false)

	onMount(async () => {
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
				fpsMode = data.enabled

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
	})

	function handleDragOver(e: DragEvent) {
		e.preventDefault()
		isDragOver = true
	}

	function handleDragLeave() {
		isDragOver = false
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault()
		isDragOver = false

		const files = e.dataTransfer?.files
		if (!files || files.length === 0) return

		const file = files[0]
		if (!file.name.toLowerCase().endsWith('.glb')) {
			modelStore.clearError()
			// 設定臨時錯誤
			modelStore.error = '檔案格式錯誤,請使用 .glb 模型'
			return
		}

		if (file.size > 1024 * 1024 * 1024) {
			modelStore.clearError()
			// 設定臨時錯誤
			modelStore.error = '模型過大，建議處理素材(>1GB)'
			return
		}

		await modelStore.loadModelFromFile(file)
	}

	function handleSelect(id: string) {
		viewerRef?.flyTo(id)
	}
</script>

<div
	class="fixed inset-0 overflow-hidden bg-background"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="region"
	aria-label="BIM Viewer"
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
					<p class="m-0 leading-relaxed text-muted-foreground">請將 .glb 檔案拖曳至此處開始</p>
				</div>
			</div>
		{/if}
	</div>

	{#if !fpsMode}
		<div class="pointer-events-none absolute bottom-0 left-0 top-0 z-10 flex">
			<Sidebar treeData={modelStore.treeData} onSelect={handleSelect} />
		</div>

		<SettingsMenu
			onGridToggle={(visible) => {
				viewerRef?.setGridVisible(visible)
			}}
			onBoundingBoxToggle={(visible) => {
				viewerRef?.setBoundingBoxVisible(visible)
			}}
		/>
	{/if}

	{#if showFPSNotification}
		<div
			class="pointer-events-none absolute left-1/2 top-8 z-[10000] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-6 py-3 font-semibold text-primary shadow-xl backdrop-blur-sm"
		>
			<span>按 ESC 鍵退出 FPS 模式</span>
		</div>
	{/if}

	{#if isDragOver}
		<div
			class="pointer-events-none absolute inset-0 z-[9000] flex items-center justify-center border-4 border-dashed border-primary bg-primary/40 backdrop-blur-sm"
		>
			<div class="rounded-full bg-white px-8 py-4 font-semibold text-primary shadow-lg">
				請在此處放開以載入模型
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
