# 技術債與重構待辦事項 (Technical Debt & Refactoring TODOs)

本文件記錄了專案中應使用 `bits-ui` 或現有 UI 元件庫但目前採用手寫實作的區域。

## 1. 對話框與模態視窗 (Dialogs & Modals)

- [x] **重構設定選單確認對話框**
  - **位置**: `src/lib/components/SettingsMenu.svelte` (約第 380 行)
  - **現狀**: ~~使用手寫的 `fixed inset-0 z-[9999]` div 與 `if showReloadDialog` 邏輯。~~
  - **完成**: 已引入 `bits-ui` 的 `AlertDialog` primitive 進行封裝。
  - **優點**: 獲得原生的無障礙支援 (Focus Trap, ESC 關閉, Screen Reader 支援)。

- [x] **評估 LoadingOverlay 重構**
  - **位置**: `src/lib/components/LoadingOverlay.svelte`
  - **現狀**: 手寫的 `fixed` 遮罩。
  - **評估結果**: 當前實作已使用 `Progress` 元件且功能簡單明確，無需重構。

## 2. 按鈕標準化 (Button Standardization)

- [x] **Sidebar 按鈕元件化**
  - **位置**: `src/lib/components/Sidebar.svelte`
  - **完成**: 已替換為專案內的 `<Button variant="ghost" size="icon" />` 元件。
  - **優點**: 統一全站按鈕的互動狀態 (Hover, Focus Ring) 與外觀。

- [x] **TreeView 按鈕元件化**
  - **位置**: `src/lib/components/TreeView.svelte`
  - **完成**: 已替換為 `<Button variant="ghost" size="icon" class="h-6 w-6" />`。

## 3. 使用者體驗增強 (UX Enhancements)

- [x] **實作 Tooltip 元件**
  - **完成**: 已基於 `bits-ui` 的 `Tooltip` primitive 建立 `src/lib/components/ui/tooltip`。
  - **應用**:
    - `Sidebar.svelte`: 已新增收合/展開按鈕、重置視角按鈕的 Tooltip。
    - `TreeView.svelte`: 已新增眼睛 (可見性) 切換按鈕、群組展開按鈕的 Tooltip。
    - `SettingsMenu.svelte`: 設定選項已有明確標籤，暫不需要額外 Tooltip。

## 4. 實作建議順序

1. ✅ 建立 `Tooltip` 與 `AlertDialog` 的基礎 UI 元件 (參考 shadcn-svelte 結構)。
2. ✅ 重構 `Sidebar` 與 `TreeView` 的按鈕 (視覺影響最小，易於驗證)。
3. ✅ 重構 `SettingsMenu` 的對話框邏輯。

---

**全部項目已完成！** 🎉

所有手寫 UI 實作已成功重構為使用 `bits-ui` primitives 與專案 UI 元件庫，提升了程式碼品質、可維護性與使用者體驗。
