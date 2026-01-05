# Draco Decoder 自動化設定

## 概述

Draco 解碼器會在每次執行 `pnpm install` 後自動從 Three.js 複製到 `static/draco/` 目錄。這確保了 Draco 版本與 Three.js 版本始終同步。

## 工作流程

1. **安裝依賴**

   ```bash
   pnpm install
   ```

2. **postinstall 自動觸發**
   - `package.json` 中的 `postinstall` 腳本會自動執行
   - 執行 `scripts/setup-draco.js`
   - 從 `node_modules/three/examples/jsm/libs/draco` 複製所有檔案到 `static/draco/`

3. **部署時**
   - Draco 檔案與其他靜態資源一併部署
   - 應用於 `@sveltejs/adapter-static`

## 檔案結構

```
static/
├── draco/                    # 自動生成的 Draco 解碼器（在 .gitignore 中）
│   ├── gltf/
│   │   ├── draco_decoder.js
│   │   ├── draco_decoder.wasm
│   │   ├── draco_encoder.js
│   │   └── draco_wasm_wrapper.js
│   ├── draco_decoder.js
│   ├── draco_decoder.wasm
│   ├── draco_encoder.js
│   ├── draco_wasm_wrapper.js
│   └── README.md
└── ...其他靜態資源
```

## Three.js 升級流程

當升級 Three.js 時：

```bash
# 1. 更新 Three.js 版本
pnpm add -D three@latest

# 2. postinstall 自動執行，複製新版本的 Draco 檔案
# 无需手動操作
```

## 手動複製

如果需要手動觸發 Draco 複製（例如調試）：

```bash
node scripts/setup-draco.js
```

## 注意事項

- `static/draco/` 目錄在 `.gitignore` 中被忽略，不應提交到版本控制
- 在本地開發和 CI/CD 部署前都會自動執行此腳本
- 腳本具有容錯能力，如果 Three.js 未安裝會顯示警告而不會中斷流程
