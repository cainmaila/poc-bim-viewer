#!/usr/bin/env node
// @ts-check

/**
 * DTA SvelteKit 專案初始化腳本
 *
 * 使用方式：
 *   npx degit fet-3312/dat-sveltekit my-project
 *   cd my-project
 *   node setup.js
 *   pnpm install
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ANSI 顏色碼
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	cyan: '\x1b[36m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
	dim: '\x1b[2m'
}

/**
 * 顯示訊息
 * @param {string} message
 * @param {'info' | 'success' | 'warning' | 'error'} type
 */
function log(message, type = 'info') {
	const prefix = {
		info: `${colors.cyan}ℹ${colors.reset}`,
		success: `${colors.green}✔${colors.reset}`,
		warning: `${colors.yellow}⚠${colors.reset}`,
		error: `${colors.red}✖${colors.reset}`
	}
	console.log(`${prefix[type]} ${message}`)
}

/**
 * 詢問使用者輸入
 * @param {string} question
 * @param {string} defaultValue
 * @returns {Promise<string>}
 */
function prompt(question, defaultValue = '') {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	const defaultHint = defaultValue ? ` ${colors.dim}(${defaultValue})${colors.reset}` : ''

	return new Promise((resolve) => {
		rl.question(`${colors.cyan}?${colors.reset} ${question}${defaultHint}: `, (answer) => {
			rl.close()
			resolve(answer.trim() || defaultValue)
		})
	})
}

/**
 * 更新 package.json
 * @param {string} projectName
 * @param {string} description
 */
function updatePackageJson(projectName, description) {
	const pkgPath = path.join(__dirname, 'package.json')
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

	pkg.name = projectName
	pkg.version = '0.0.1'
	pkg.private = true
	if (description) {
		pkg.description = description
	}

	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n')
	log(`已更新 package.json`, 'success')
}

/**
 * 更新 README.md
 * @param {string} projectName
 * @param {string} description
 */
function updateReadme(projectName, description) {
	const readmePath = path.join(__dirname, 'README.md')

	if (!fs.existsSync(readmePath)) return

	let content = fs.readFileSync(readmePath, 'utf-8')

	// 替換標題
	content = content.replace(/^# .+$/m, `# ${projectName}`)

	// 替換描述（第一段）
	if (description) {
		content = content.replace(/^# .+\n\n.+$/m, `# ${projectName}\n\n${description}`)
	}

	fs.writeFileSync(readmePath, content)
	log(`已更新 README.md`, 'success')
}

/**
 * 建立 .env 檔案
 */
function createEnvFile() {
	const envExamplePath = path.join(__dirname, '.env.example')
	const envPath = path.join(__dirname, '.env')

	if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
		fs.copyFileSync(envExamplePath, envPath)
		log(`已建立 .env`, 'success')
	}
}

/**
 * 初始化 Git
 */
function initGit() {
	const gitPath = path.join(__dirname, '.git')

	// 如果已經有 .git 目錄，跳過
	if (fs.existsSync(gitPath)) {
		return
	}

	try {
		execSync('git init', { cwd: __dirname, stdio: 'ignore' })
		log(`已初始化 Git`, 'success')
	} catch {
		log(`無法初始化 Git，請手動執行 git init`, 'warning')
	}
}

/**
 * 清理樣板檔案
 */
function cleanup() {
	const filesToRemove = ['setup.js', 'doc']

	for (const file of filesToRemove) {
		const filePath = path.join(__dirname, file)
		if (fs.existsSync(filePath)) {
			const stat = fs.statSync(filePath)
			if (stat.isDirectory()) {
				fs.rmSync(filePath, { recursive: true })
			} else {
				fs.unlinkSync(filePath)
			}
		}
	}
	log(`已清理樣板檔案`, 'success')
}

/**
 * 主程式
 */
async function main() {
	console.log()
	console.log(`${colors.bright}${colors.cyan}🏢 DTA SvelteKit 專案初始化${colors.reset}`)
	console.log()

	// 取得當前目錄名稱作為預設專案名稱
	const currentDir = path.basename(__dirname)
	const defaultName = currentDir === 'dat-sveltekit' ? 'my-dta-app' : currentDir

	// 詢問專案資訊
	const projectName = await prompt('專案名稱', defaultName)
	const description = await prompt('專案描述', '')

	console.log()

	// 更新檔案
	updatePackageJson(projectName, description)
	updateReadme(projectName, description)
	createEnvFile()
	initGit()

	// 清理樣板檔案
	cleanup()

	console.log()
	log('專案初始化完成！', 'success')
	console.log()
	console.log(`  下一步：`)
	console.log(`  ${colors.cyan}pnpm install${colors.reset}`)
	console.log(`  ${colors.cyan}pnpm dev${colors.reset}`)
	console.log()
}

main().catch((err) => {
	log(err.message, 'error')
	process.exit(1)
})
