#!/usr/bin/env node
/**
 * 自動複製 Three.js Draco 解碼器到 static 目錄
 * 在每次 pnpm install 後執行，確保 Draco 版本與 Three.js 同步
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const sourceDir = path.join(projectRoot, 'node_modules/three/examples/jsm/libs/draco')
const targetDir = path.join(projectRoot, 'static/draco')

/**
 * 遞歸複製目錄
 */
function copyDirSync(src, dest) {
	// 建立目標目錄
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true })
	}

	// 列出來源目錄中的所有檔案和子目錄
	const files = fs.readdirSync(src)

	for (const file of files) {
		const srcPath = path.join(src, file)
		const destPath = path.join(dest, file)
		const stat = fs.statSync(srcPath)

		if (stat.isDirectory()) {
			// 遞歸複製子目錄
			copyDirSync(srcPath, destPath)
		} else {
			// 複製檔案
			fs.copyFileSync(srcPath, destPath)
		}
	}
}

try {
	// 檢查來源目錄是否存在
	if (!fs.existsSync(sourceDir)) {
		console.warn(`⚠️  Warning: Draco source directory not found at ${sourceDir}`)
		process.exit(0)
	}

	// 複製 Draco 檔案
	copyDirSync(sourceDir, targetDir)
	console.log(`✅ Draco decoder copied to ${targetDir}`)
} catch (error) {
	console.error('❌ Failed to copy Draco decoder:', error.message)
	process.exit(1)
}
