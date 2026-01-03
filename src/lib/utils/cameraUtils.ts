import * as THREE from 'three'

/**
 * 計算相機最佳距離以適配物件至視口
 *
 * @param boundingBox - 目標物件的 THREE.Box3
 * @param camera - THREE.PerspectiveCamera
 * @param viewDirection - 從物件到相機的歸一化方向向量
 * @param padding - 邊距係數 (0.15 = 15%)
 * @returns 從物件中心的最佳距離
 */
export function calculateOptimalDistance(
	boundingBox: THREE.Box3,
	camera: THREE.PerspectiveCamera,
	viewDirection: THREE.Vector3,
	padding: number = 0.15
): number {
	const size = boundingBox.getSize(new THREE.Vector3())

	// 處理退化案例（零維度）
	const epsilon = 0.001
	if (size.x < epsilon || size.y < epsilon || size.z < epsilon) {
		return 10
	}

	// 獲取相機參數
	const fovRadians = camera.fov * (Math.PI / 180)
	const aspect = camera.aspect

	// 計算投影尺寸（基於視角方向）
	const projectedWidth = calculateProjectedWidth(size, viewDirection)
	const projectedHeight = calculateProjectedHeight(size, viewDirection)

	// 計算垂直適配距離
	const distanceVertical = projectedHeight / (2 * Math.tan(fovRadians / 2))

	// 計算水平適配距離（限制 aspect ratio 範圍）
	const clampedAspect = Math.max(0.5, Math.min(3.0, aspect))
	const distanceHorizontal = projectedWidth / (2 * clampedAspect * Math.tan(fovRadians / 2))

	// 取較大距離以確保完全可見
	const baseDistance = Math.max(distanceVertical, distanceHorizontal)

	// 應用邊距
	const paddedDistance = baseDistance * (1 + padding)

	// 應用最小/最大限制
	const minDistance = 5
	const maxDistance = 1000

	return Math.max(minDistance, Math.min(maxDistance, paddedDistance))
}

/**
 * 計算投影寬度（物件在視平面上的寬度）
 */
function calculateProjectedWidth(size: THREE.Vector3, viewDirection: THREE.Vector3): number {
	const absDir = new THREE.Vector3(
		Math.abs(viewDirection.x),
		Math.abs(viewDirection.y),
		Math.abs(viewDirection.z)
	)

	// 保守估計：垂直於視角方向的分量
	return Math.sqrt(
		Math.pow(size.x * (1 - absDir.x), 2) +
			Math.pow(size.y * (1 - absDir.y), 2) +
			Math.pow(size.z * (1 - absDir.z), 2)
	)
}

/**
 * 計算投影高度（物件在視平面上的高度）
 */
function calculateProjectedHeight(size: THREE.Vector3, viewDirection: THREE.Vector3): number {
	const absDir = new THREE.Vector3(
		Math.abs(viewDirection.x),
		Math.abs(viewDirection.y),
		Math.abs(viewDirection.z)
	)

	return Math.sqrt(
		Math.pow(size.x * (1 - absDir.x), 2) +
			Math.pow(size.y * (1 - absDir.y), 2) +
			Math.pow(size.z * (1 - absDir.z), 2)
	)
}

/**
 * 選擇最佳視角方向（處理邊緣案例）
 *
 * @param currentDirection - 當前相機方向
 * @param boundingBox - 物件外匡盒
 * @returns 最佳視角方向（歸一化）
 */
export function selectViewDirection(
	currentDirection: THREE.Vector3,
	boundingBox: THREE.Box3
): THREE.Vector3 {
	// 檢查當前方向是否導致側視圖（物件看起來像一條線）
	const size = boundingBox.getSize(new THREE.Vector3())
	const projectedWidth = calculateProjectedWidth(size, currentDirection)
	const minVisibleSize = Math.max(size.x, size.y, size.z) * 0.1

	if (projectedWidth < minVisibleSize) {
		// 當前視角過於側面，改用等距視圖
		return new THREE.Vector3(1, 1, 1).normalize()
	}

	// 預設：保持當前方向
	return currentDirection.clone().normalize()
}
