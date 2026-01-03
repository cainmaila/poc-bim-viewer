<script lang="ts">
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { getActiveModelKey } from '$lib/utils/database'
	import { Button } from '$lib/components/ui/button'
	import { Upload } from 'lucide-svelte'

	let fileInputRef = $state<HTMLInputElement | null>(null)

	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const currentModelKey = await getActiveModelKey()

			if (!currentModelKey) {
				alert('請先載入模型')
				return
			}

			const result = await bimSettingsStore.importSettings(text, currentModelKey)

			if (result.success) {
				alert('匯入成功')
				// 重新生成樹狀資料和套用設定
				if (modelStore.model) {
					await bimSettingsStore.initForModel(currentModelKey, modelStore.model)
				}
				console.log('[BIMSettingsImport] Settings imported successfully')
			} else {
				alert(`匯入失敗：${result.error}`)
				console.error('[BIMSettingsImport] Import failed:', result.error)
			}
		} catch (error) {
			alert(`匯入失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
			console.error('[BIMSettingsImport] Import failed:', error)
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
