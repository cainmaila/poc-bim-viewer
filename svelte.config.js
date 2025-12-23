import fs from 'node:fs'
import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const nodePkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		version: {
			name: `v${nodePkg.version}`
		},
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		paths: {
			// 開發環境使用根路徑，建構時從環境變數讀取
			base: process.env.PUBLIC_BASE_PATH || ''
		}
	},
	vitePlugin: {
		inspector: true
	}
}

export default config
