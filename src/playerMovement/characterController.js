import * as THREE from 'three'

/**
 * Quản lý behavior của các nhân vật (Dummy, Guy, Guide)
 * Khi không bị cam possess: Idle stance, quay mặt về camera
 * Khi bị cam possess: Quay mặt theo camera direction
 */
export class CharacterController {
    constructor(camera) {
        this.camera = camera
        this.currentPitch = 0
        this._tmpDirToCamera = new THREE.Vector3()
        this._tmpCameraDir = new THREE.Vector3()
    }

    _getLegs(mesh) {
        const legCacheSize = mesh.userData._legCacheSize
        const legCache = mesh.userData._legCache

        if (Array.isArray(legCache) && legCacheSize === mesh.children.length) {
            return legCache
        }

        const legs = mesh.children.filter(child => child.userData?.isLeg)
        mesh.userData._legCache = legs
        mesh.userData._legCacheSize = mesh.children.length
        return legs
    }

    updateWalkAnimation(mesh, body, delta = 1 / 60, speedForFullSwing = 1.0) {
        if (!mesh || !body) return

        const legs = this._getLegs(mesh)
        if (legs.length === 0) return

        const vx = body.velocity?.x ?? 0
        const vz = body.velocity?.z ?? 0
        const speed = Math.hypot(vx, vz)

        if (mesh.userData.walkTime === undefined) {
            mesh.userData.walkTime = 0
        }

        // Keep a visible but smooth gait while moving.
        const speedNorm = Math.min(1, speed / Math.max(0.0001, speedForFullSwing))
        const targetAmp = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(32), speedNorm)
        const targetFreq = THREE.MathUtils.lerp(0, 9.5, speedNorm)

        if (speedNorm > 0.02) {
            mesh.userData.walkTime += delta * targetFreq
            const swing = Math.sin(mesh.userData.walkTime) * targetAmp
            if (legs[0]) legs[0].rotation.x = swing
            if (legs[1]) legs[1].rotation.x = -swing
            return
        }

        // Ease back to neutral when nearly stopped.
        const easing = Math.min(1, 10 * delta)
        legs.forEach(leg => {
            leg.rotation.x += (0 - leg.rotation.x) * easing
        })
    }

    /**
     * Cập nhật nhân vật khi KHÔNG bị possess (idle mode)
     * @param {THREE.Group} mesh - Character mesh
     * @param {CANNON.Body} body - Character physics body
     */
    updateIdleMode(mesh, body, delta = 1 / 60) {
        // Initialize bodyYaw in userData if not exists
        if (mesh.userData.bodyYaw === undefined) {
            mesh.userData.bodyYaw = mesh.rotation.y
        }

        // 1. Tính yaw để quay mặt về camera
        const dirToCamera = this._tmpDirToCamera
            .subVectors(this.camera.position, mesh.position)

        if (dirToCamera.lengthSq() > 1e-8) {
            dirToCamera.normalize()
        }

        // Tính yaw angle để face camera
        const targetYaw = Math.atan2(dirToCamera.x, dirToCamera.z)
        
        // Smooth interpolation về target yaw
        let diff = targetYaw - mesh.userData.bodyYaw
        
        // Handle angle wrapping
        if (diff > Math.PI) diff -= 2 * Math.PI
        if (diff < -Math.PI) diff += 2 * Math.PI
        
        mesh.userData.bodyYaw += diff * 5 * delta // Smooth 5 rad/s rotation

        // 2. Reset leg animations (idle position)
        this.updateWalkAnimation(mesh, body, delta, 9999)

        // 3. Áp dụng rotation vào mesh ONLY (visual)
        // Không set body quaternion - để physics engine quản lý
        mesh.rotation.y = mesh.userData.bodyYaw
    }

    /**
     * Cập nhật nhân vật khi BỊ possess (possessed mode)
     * Quay mặt theo camera direction (giống Player behavior)
     * @param {THREE.Group} mesh - Character mesh
     * @param {CANNON.Body} body - Character physics body
     */
    updatePossessedMode(mesh, body, delta = 1 / 60) {
        // Initialize bodyYaw in userData if not exists
        if (mesh.userData.bodyYaw === undefined) {
            mesh.userData.bodyYaw = mesh.rotation.y
        }

        // Camera direction
        const cameraDir = this._tmpCameraDir
        this.camera.getWorldDirection(cameraDir)
        cameraDir.y = 0
        if (cameraDir.lengthSq() > 1e-8) {
            cameraDir.normalize()
        }

        // Calculate yaw từ camera direction
        const targetYaw = Math.atan2(cameraDir.x, cameraDir.z)
        
        // Smooth rotation
        let diff = targetYaw - mesh.userData.bodyYaw
        
        // Handle angle wrapping
        if (diff > Math.PI) diff -= 2 * Math.PI
        if (diff < -Math.PI) diff += 2 * Math.PI
        
        // Faster rotation khi possessed
        mesh.userData.bodyYaw += diff * 3 * delta

        // Reset legs (no animation while idle)
        this.updateWalkAnimation(mesh, body, delta, 9999)

        // Apply rotation to mesh only (visual)
        mesh.rotation.y = mesh.userData.bodyYaw
    }

    /**
     * Lấy body yaw hiện tại (for animation/AI systems)
     */
    getBodyYaw(mesh) { 
        return mesh.userData.bodyYaw ?? mesh.rotation.y
    }

    /**
     * Set body yaw (for external control)
     */
    setBodyYaw(mesh, yaw) { 
        mesh.userData.bodyYaw = yaw 
    }
}
