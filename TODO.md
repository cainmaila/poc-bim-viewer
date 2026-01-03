# 技術債與重構待辦事項 (Technical Debt & Refactoring TODOs)

本文件記錄了專案中應使用 `bits-ui` 或現有 UI 元件庫但目前採用手寫實作的區域。

## 1. 對話框與模態視窗 (Dialogs & Modals)

- [ ] **重構設定選單確認對話框**
  - **位置**: `src/lib/components/SettingsMenu.svelte` (約第 380 行)
  - **現狀**: 使用手寫的 `fixed inset-0 z-[9999]` div 與 `if showReloadDialog` 邏輯。
  - **目標**: 引入 `bits-ui` 的 `AlertDialog` 或 `Dialog` primitive 進行封裝。
  - **優點**: 獲得原生的無障礙支援 (Focus Trap, ESC 關閉, Screen Reader 支援)。

- [ ] **評估 LoadingOverlay 重構**
  - **位置**: `src/lib/components/LoadingOverlay.svelte`
  - **現狀**: 手寫的 `fixed` 遮罩。
  - **目標**: 考慮使用 `Dialog` primitive 或確保 `Portal` 的正確使用，以避免 z-index 層級衝突。

## 2. 按鈕標準化 (Button Standardization)

- [ ] **Sidebar 按鈕元件化**
  - **位置**: `src/lib/components/Sidebar.svelte`
  - **現狀**: 使用原生 `<button>` 標籤搭配手寫 Tailwind class (`hover:bg-accent/10`)。
  - **目標**: 替換為專案內的 `<Button variant="ghost" size="icon" />` 元件。
  - **優點**: 統一全站按鈕的互動狀態 (Hover, Focus Ring) 與外觀。

- [ ] **TreeView 按鈕元件化**
  - **位置**: `src/lib/components/TreeView.svelte`
  - **現狀**: 展開/收合箭頭與眼睛圖示使用原生 `<button>`。
  - **目標**: 替換為 `<Button variant="ghost" size="icon" class="h-6 w-6" />` (需調整尺寸以適應樹狀結構)。

## 3. 使用者體驗增強 (UX Enhancements)

- [ ] **實作 Tooltip 元件**
  - **現狀**: 專案中目前缺少 Tooltip 元件，僅依賴 HTML `title` 屬性。
  - **目標**: 基於 `bits-ui` 的 `Tooltip` primitive 建立 `src/lib/components/ui/tooltip`。
  - **應用**:
    - `Sidebar.svelte`: 收合/展開按鈕、重置視角按鈕。
    - `TreeView.svelte`: 眼睛 (可見性) 切換按鈕、群組展開按鈕。
    - `SettingsMenu.svelte`: 各種設定開關的說明。

## 4. 實作建議順序

1. 建立 `Tooltip` 與 `AlertDialog` 的基礎 UI 元件 (參考 shadcn-svelte 結構)。
2. 重構 `Sidebar` 與 `TreeView` 的按鈕 (視覺影響最小，易於驗證)。
3. 重構 `SettingsMenu` 的對話框邏輯。
