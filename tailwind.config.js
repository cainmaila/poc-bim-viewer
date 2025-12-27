/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	plugins: [
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('@tailwindcss/typography'),
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('@tailwindcss/forms')
	]
}
