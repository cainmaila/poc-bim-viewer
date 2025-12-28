import type * as THREE from 'three'

export type ViewDirection = 'isometric' | 'top' | 'front' | 'side'

export interface CameraAnimationOptions {
	duration?: number
	padding?: number
	onComplete?: () => void
}

export interface CameraState {
	position: THREE.Vector3
	target: THREE.Vector3
	fov: number
}
