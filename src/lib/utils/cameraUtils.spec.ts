import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { calculateOptimalDistance, selectViewDirection } from './cameraUtils'

describe('calculateOptimalDistance', () => {
	it('should handle cube (equal dimensions)', () => {
		const box = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
		const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 2000)
		const viewDir = new THREE.Vector3(1, 1, 1).normalize()
		const distance = calculateOptimalDistance(box, camera, viewDir)

		// For a 10x10x10 cube with 15% padding, distance should be around 10-12
		expect(distance).toBeGreaterThan(9)
		expect(distance).toBeLessThan(15)
	})

	it('should handle elongated object (100x1x1)', () => {
		const box = new THREE.Box3(new THREE.Vector3(-50, -0.5, -0.5), new THREE.Vector3(50, 0.5, 0.5))
		const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 2000)
		const viewDir = new THREE.Vector3(1, 0, 0).normalize()
		const distance = calculateOptimalDistance(box, camera, viewDir)

		// Should frame the 1m width, not the 100m length (viewing from the side)
		expect(distance).toBeGreaterThan(1)
		expect(distance).toBeLessThan(10)
	})

	it('should respect minimum distance', () => {
		const box = new THREE.Box3(
			new THREE.Vector3(-0.01, -0.01, -0.01),
			new THREE.Vector3(0.01, 0.01, 0.01)
		)
		const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 2000)
		const viewDir = new THREE.Vector3(1, 1, 1).normalize()
		const distance = calculateOptimalDistance(box, camera, viewDir)

		expect(distance).toBeGreaterThanOrEqual(5)
	})

	it('should handle different aspect ratios', () => {
		const box = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
		const viewDir = new THREE.Vector3(1, 1, 1).normalize()

		const wideCamera = new THREE.PerspectiveCamera(45, 21 / 9, 0.1, 2000)
		const tallCamera = new THREE.PerspectiveCamera(45, 9 / 16, 0.1, 2000)

		const wideDistance = calculateOptimalDistance(box, wideCamera, viewDir)
		const tallDistance = calculateOptimalDistance(box, tallCamera, viewDir)

		// Taller viewport needs more distance to fit horizontally
		expect(tallDistance).toBeGreaterThan(wideDistance)
	})

	it('should apply padding correctly', () => {
		const box = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
		const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 2000)
		const viewDir = new THREE.Vector3(1, 1, 1).normalize()

		const noPadding = calculateOptimalDistance(box, camera, viewDir, 0)
		const withPadding = calculateOptimalDistance(box, camera, viewDir, 0.15)

		expect(withPadding).toBeCloseTo(noPadding * 1.15, 1)
	})
})

describe('selectViewDirection', () => {
	it('should keep current direction for normal views', () => {
		const box = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
		const currentDir = new THREE.Vector3(1, 0.5, 0.3).normalize()

		const result = selectViewDirection(currentDir, box)

		expect(result.x).toBeCloseTo(currentDir.x, 2)
		expect(result.y).toBeCloseTo(currentDir.y, 2)
		expect(result.z).toBeCloseTo(currentDir.z, 2)
	})

	it('should switch to isometric for edge-on views', () => {
		const box = new THREE.Box3(new THREE.Vector3(-50, -0.5, -0.5), new THREE.Vector3(50, 0.5, 0.5))
		// Viewing directly along the long axis
		const edgeOnDir = new THREE.Vector3(1, 0, 0).normalize()

		const result = selectViewDirection(edgeOnDir, box)

		// Should fall back to isometric (1,1,1)
		const isometric = new THREE.Vector3(1, 1, 1).normalize()
		expect(result.x).toBeCloseTo(isometric.x, 2)
		expect(result.y).toBeCloseTo(isometric.y, 2)
		expect(result.z).toBeCloseTo(isometric.z, 2)
	})
})
