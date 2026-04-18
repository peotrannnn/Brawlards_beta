import * as THREE from 'three'

const GUY_AI_CONFIG = {
  visionRange: 40,
  baseMaxSpeed: 1.2,
  acceleration: 8,
  stopDistance: 0.6,
  rotationSmooth: 3.5,
  fixedTimeStep: 1/60,
  predictionError: 2,
  jumpForce: 3,
  jumpCooldown: 0,
  stuckThreshold: 0.01,
  speedMultipliers: [1, 2, 3, 4, 5, 5],
  escapeAngles: [0, Math.PI/2, Math.PI, -Math.PI/2]
}

export class GuyAI {
  constructor(guyMesh, guyBody, scene) {
    this.mesh = guyMesh
    this.body = guyBody
    this.scene = scene
    
    this.visionRange = guyMesh.userData.visionRange || GUY_AI_CONFIG.visionRange
    this.baseMaxSpeed = GUY_AI_CONFIG.baseMaxSpeed
    this.acceleration = GUY_AI_CONFIG.acceleration
    this.stopDistance = GUY_AI_CONFIG.stopDistance
    
    this.bodyYaw = 0
    this.rotationSmooth = GUY_AI_CONFIG.rotationSmooth
    this.fixedTimeStep = GUY_AI_CONFIG.fixedTimeStep

    this.timeAlive = 0
    this.randomMoveTimer = 0
    this.randomDir = new THREE.Vector3()
    this.predictionError = GUY_AI_CONFIG.predictionError
    
    this.jumpForce = GUY_AI_CONFIG.jumpForce
    this.jumpCooldown = 0
    this.canJump = true
    this.isGrounded = true
    this.justJumped = false

    this.stuckTimer = 0
    this.lastPos = new THREE.Vector3()

    this.escapeIndex = 0
    this.escapeAttempts = 0
    this.reverseTimer = 0
    this.isReversing = false

    this.escapeAngles = GUY_AI_CONFIG.escapeAngles
    this.originalMass = this.body.mass
    this.isGhost = false
    
    this.currentPhase = 1
    this.onPhaseChange = null
  }

  update(delta, syncList) {
    this.timeAlive += delta

        const phase = Math.min(6, Math.floor(this.timeAlive/10)+1)
        
        // Check if phase changed and trigger event
        if (phase !== this.currentPhase) {
            const oldPhase = this.currentPhase
            this.currentPhase = phase
            if (this.onPhaseChange) {
                this.onPhaseChange(phase, oldPhase, this.mesh.position)
            }
        }

        const speedMultipliers = [1,2,3,4,5,5]
        const currentMaxSpeed = this.baseMaxSpeed * speedMultipliers[phase-1]

        let nearestPlayer = null
        let minDistance = Infinity
        
        syncList.forEach(other => {

            if (other.name === 'Player' && other.mesh) {

                const dist = this.mesh.position.distanceTo(other.mesh.position)

                if (dist < minDistance) {

                    minDistance = dist
                    nearestPlayer = other
                }
            }
        })

        const playerVisible = nearestPlayer && minDistance <= this.visionRange

        // GHOST MODE

        if (phase === 6) {

            if (!this.isGhost) {

                this.isGhost = true
                this.body.mass = 0
                this.body.updateMassProperties()
            }

            if (!playerVisible) {

                const slowFactor = 0.94

                this.body.velocity.x *= slowFactor
                this.body.velocity.y *= slowFactor
                this.body.velocity.z *= slowFactor

                if (Math.abs(this.body.velocity.x) < 0.05) this.body.velocity.x = 0
                if (Math.abs(this.body.velocity.y) < 0.05) this.body.velocity.y = 0
                if (Math.abs(this.body.velocity.z) < 0.05) this.body.velocity.z = 0

                return this.bodyYaw
            }

            const playerPos = nearestPlayer.mesh.position

            const dir = new THREE.Vector3()
                .subVectors(playerPos, this.mesh.position)
                .normalize()

            const ghostSpeed = currentMaxSpeed * 2

            this.body.velocity.x = dir.x * ghostSpeed
            this.body.velocity.y = dir.y * ghostSpeed
            this.body.velocity.z = dir.z * ghostSpeed

            this.bodyYaw = Math.atan2(dir.x, dir.z)

            this.mesh.rotation.y = this.bodyYaw

            return this.bodyYaw
        }

        // EXIT GHOST MODE

        if (this.isGhost) {

            this.isGhost = false
            this.body.mass = this.originalMass
            this.body.updateMassProperties()
        }

        if (!playerVisible) {

            this.body.velocity.x = 0
            this.body.velocity.z = 0

            this.stuckTimer = 0
            this.escapeAttempts = 0
            this.isReversing = false

            return null
        }

        const playerPos = nearestPlayer.mesh.position

        const verticalVelocity = this.body.velocity.y

        if (verticalVelocity < -0.1) this.justJumped = false

        this.isGrounded = Math.abs(verticalVelocity) < 0.1 && !this.justJumped

        if (this.isGrounded) this.canJump = true

        this.jumpCooldown -= delta

        const jumpIntervals = [5,3,2,1,0.5]
        const currentJumpInterval = jumpIntervals[phase-1]

        if (this.jumpCooldown <= 0 && this.canJump && this.isGrounded) {

            this.body.velocity.y = this.jumpForce

            this.canJump = false
            this.justJumped = true

            const randomOffset =
                (Math.random()-0.5)*2*currentJumpInterval

            this.jumpCooldown = currentJumpInterval + randomOffset
        }

        const currentPos = this.mesh.position.clone()
        const movedDist = currentPos.distanceTo(this.lastPos)

        const speedFactor = currentMaxSpeed * delta
        const stuckThreshold = speedFactor * 0.3

        if (movedDist < stuckThreshold) this.stuckTimer += delta
        else this.stuckTimer = 0

        this.lastPos.copy(currentPos)

        let moveDir = new THREE.Vector3()

        const futurePos = new THREE.Vector3()
            .copy(playerPos)
            .addScaledVector(nearestPlayer.body.velocity,0.5)

        futurePos.x += (Math.random()-0.5)*this.predictionError
        futurePos.z += (Math.random()-0.5)*this.predictionError

        moveDir.subVectors(futurePos,this.mesh.position).normalize()

        if (!this.isReversing) {

            this.randomMoveTimer -= delta

            if (this.randomMoveTimer <= 0) {

                this.randomMoveTimer =
                    1 + Math.random()*2 +
                    (1 - Math.min(1,this.timeAlive/60))*2

                this.randomDir.set(
                    Math.random()-0.5,
                    0,
                    Math.random()-0.5
                ).normalize()
            }

            const zigzag = this.randomDir.clone().multiplyScalar(0.5)

            moveDir.add(zigzag).normalize()
        }

        if (this.isReversing) {

            this.reverseTimer -= delta

            moveDir.set(
                -Math.sin(this.bodyYaw),
                0,
                -Math.cos(this.bodyYaw)
            )

            const reverseSpeed = currentMaxSpeed * 2.5

            const targetVelX = moveDir.x * reverseSpeed
            const targetVelZ = moveDir.z * reverseSpeed

            this.body.velocity.x +=
                (targetVelX - this.body.velocity.x) *
                this.acceleration *
                this.fixedTimeStep

            this.body.velocity.z +=
                (targetVelZ - this.body.velocity.z) *
                this.acceleration *
                this.fixedTimeStep

            if (this.reverseTimer <= 0) {

                this.isReversing = false
                this.escapeAttempts = 0

                const randomTurn = (Math.random()-0.5)*Math.PI
                this.bodyYaw += randomTurn
            }

            this.mesh.rotation.y = this.bodyYaw

            return this.bodyYaw
        }

        if (this.stuckTimer > 0.6) {

            const angle = this.escapeAngles[this.escapeIndex]

            moveDir.set(
                Math.sin(angle),
                0,
                Math.cos(angle)
            ).normalize()

            this.body.velocity.x = 0
            this.body.velocity.z = 0

            this.escapeIndex =
                (this.escapeIndex + 1) % this.escapeAngles.length

            this.escapeAttempts++

            if (this.escapeAttempts > 4) {

                this.isReversing = true
                this.reverseTimer = 1
            }

            this.stuckTimer = 0
        }

        const toPlayer = new THREE.Vector3()
            .subVectors(playerPos,this.mesh.position)
            .normalize()

        const targetYaw = Math.atan2(toPlayer.x,toPlayer.z)

        let diff = targetYaw - this.bodyYaw
        
        if (diff > Math.PI) diff -= Math.PI*2
        if (diff < -Math.PI) diff += Math.PI*2
        
        this.bodyYaw +=
            diff * this.rotationSmooth * this.fixedTimeStep

        this.mesh.rotation.y = this.bodyYaw

        const targetVelX = moveDir.x * currentMaxSpeed
        const targetVelZ = moveDir.z * currentMaxSpeed

        this.body.velocity.x +=
            (targetVelX - this.body.velocity.x) *
            this.acceleration *
            this.fixedTimeStep

        this.body.velocity.z +=
            (targetVelZ - this.body.velocity.z) *
            this.acceleration *
            this.fixedTimeStep

        return this.bodyYaw
    }
}