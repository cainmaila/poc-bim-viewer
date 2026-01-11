<script lang="ts">
	/**
	 * @component BIMSettingsImportButton
	 *
	 * BIM 設定匯入按鈕，從 JSON 檔案匯入模型的屬性設定。
	 *
	 * 功能：
	 * - 支援匯入先前匯出的 JSON 設定檔
	 * - 自動驗證 JSON 格式
	 * - 支援跨模型匯入（會自動過濾不存在的節點路徑）
	 *
	 * @example
	 * ```svelte
	 * <BIMSettingsImportButton />
	 * ```
	 */
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { getActiveModelKey } from '$lib/utils/database'
	import { Button } from '$lib/components/ui/button'
	import { Upload } from 'lucide-svelte'
	import { notify } from '$lib/utils/notify'

	let fileInputRef = $state<HTMLInputElement | null>(null)

	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const currentModelKey = await getActiveModelKey()

			if (!currentModelKey) {
				notify.error('請先載入模型')
				return
			}

			const result = await bimSettingsStore.importSettings(text, currentModelKey)

			if (result.success) {
				notify.success('匯入成功')
				// 重新生成樹狀資料和套用設定
				if (modelStore.model) {
					await bimSettingsStore.initForModel(currentModelKey, modelStore.model)
				}
			} else {
				notify.error(`匯入失敗：${result.error}`)
			}
		} catch (error) {
			notify.error(`匯入失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
		} finally {
			// Reset input value to allow re-importing the same file
			input.value = ''
		}
	}
</script>

<Button variant="outline" size="sm" onclick={() => fileInputRef?.click()}>
	<Upload size={16} class="mr-2" />
	匯入設定
</Button>

<input bind:this={fileInputRef} type="file" accept=".json" class="hidden" onchange={handleImport} />
