// 請參閱 https://svelte.dev/docs/kit/types#app.d.ts
// 以獲取有關這些接口的信息

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// three-viewport-gizmo 型別聲明
declare module 'three-viewport-gizmo' {
	import type * as THREE from 'three'
	import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

	export interface GizmoOptions {
		container?: HTMLElement | string
		type?: 'sphere' | 'cube'
		size?: number
		placement?:
			| 'top-left'
			| 'top-center'
			| 'top-right'
			| 'center-left'
			| 'center-center'
			| 'center-right'
			| 'bottom-left'
			| 'bottom-center'
			| 'bottom-right'
		offset?: {
			left?: number
			top?: number
			right?: number
			bottom?: number
		}
		animated?: boolean
		speed?: number
		resolution?: number
		lineWidth?: number
		id?: string
		className?: string
	}

	export class ViewportGizmo {
		constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer, config?: GizmoOptions)
		render(): void
		update(): void
		dispose(): void
		attachControls(controls: OrbitControls): void
		detachControls(): void
	}
}

export {}
