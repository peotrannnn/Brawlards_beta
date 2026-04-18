import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { BALL8_AI_CONFIG } from '../assets/objects/BallFactory.js'

// Ball8AI uses config from BallFactory.js (the source of truth)

export class Ball8AI {
  /**
   * BALL 8 AI SYSTEM
   * ================
   * 
   * CONFIG SOURCE: BALL8_AI_CONFIG is defined in BallFactory.js
   * - This class imports and uses that config for behavior
   * - Mesh trigger sizes are defined in BallFactory.js and synchronized here
   * 
   * TO CUSTOMIZE BALL 8 BEHAVIOR:
   * - Edit BALL8_AI_CONFIG in BallFactory.js (the source of truth)
   * - Changes affect both mesh trigger sizes AND AI behavior
   * - detectionRange: Controls outer trigger mesh + vision range
   * - groupingMinDistance: Controls inner trigger mesh + spacing
   * - Other settings: baseMaxSpeed, acceleration, etc.
   */
  constructor(ballMesh, ballBody, scene, camera = null, particleManager = null) {
    this.mesh = ballMesh
    this.body = ballBody
    this.scene = scene
    this.camera = camera
    this.particleManager = particleManager
    
    // Load all settings from config at top of file
    // detectionRange: used for BOTH player vision AND Ball 8 detection distance
    this.detectionRange = BALL8_AI_CONFIG.detectionRange
    this.groupingMinDistance = BALL8_AI_CONFIG.groupingMinDistance
    this.baseMaxSpeed = BALL8_AI_CONFIG.baseMaxSpeed
    this.acceleration = BALL8_AI_CONFIG.acceleration
    this.rotationSmooth = BALL8_AI_CONFIG.rotationSmooth
    this.fixedTimeStep = BALL8_AI_CONFIG.fixedTimeStep
    this.groupThreshold = BALL8_AI_CONFIG.groupThreshold

    this.bodyYaw = 0
    
    this.timeAlive = 0
    this.randomMoveTimer = 0
    this.randomDir = new THREE.Vector3()
    
    // ✨ NEW: 3-second startup delay - ball 8 won't move during this time
    this.startupDelayDuration = 3.0  // 3 seconds before ball 8 can move
    this.canMove = false             // Will be true after startup delay
    
    this.groupedBalls8Count = 0 // Count of Ball 8s in group trigger (including self)
    this.groupCenter = new THREE.Vector3()
    this.isGrouped = false
    
    this.lastPos = new THREE.Vector3()
    this.stuckTimer = 0

    // ===== EVASION SYSTEM (3 algorithms) =====
    // Current speed multiplier (set during flee behavior, used in velocity logic)
    this.currentSpeedMultiplier = 1.0

    // 1. IMPROVED ZIGZAG PATTERN
    this.zigzagTimer = 0
    this.zigzagPhase = 0  // 0=left, 1=straight, 2=right, 3=straight (cycle)
    this.baseZigzagStrength = 0.2  // Base deviation from straight escape (20% at normal)
    this.baseZigzagInterval = 0.35  // Base change direction interval (0.35s at normal, slower = more predictable)
    
    // 2. PANIC MODE (when player too close)
    this.panicDistance = this.detectionRange * 0.25  // Panic when within 25% of detection range
    this.isPanicking = false
    this.panicRandomDir = new THREE.Vector3()
    this.panicTimer = 0
    
    // ===== PANIC LEVEL GRADIENT (0.0 to 1.0) - 3 PHASE SYSTEM =====
    // Phase 1: panicLevel 0.0-0.35 = Structured escape (calm, predictable, vận tốc bình thường)
    // Phase 2: panicLevel 0.35-0.85 = Chaotic escape (hỗn loạn, khó đoán, nhanh hơn)
    // Phase 3: panicLevel 0.85-1.0 = Extreme panic (lăng tăng, rất nhanh, mạnh nhất)
    this.panicLevel = 0.0
    this.minPanicDistance = this.detectionRange * 0.08  // Start full panic when player is 8% of detection range away
    this.maxCalmDistance = this.detectionRange * 0.6   // Start noticing player at 60% distance (wider range for gradual response)
    this.chaosThreshold = 0.35  // Switch from structured to chaotic movement at 35% panic
    this.extremePanicThreshold = 0.85  // Switch to extreme panic mode at 85% panic level
    
    // Panic modifiers that scale with panicLevel
    // Speed progression: calm(0.6x) → chaos(1.5x) → panic(4.5x)
    this.basePanicSpeedMultiplier = 6
    this.chaosSpeedMultiplier = 6
    this.basePanicZigzagMultiplier = 3.0     // 3.0x more zigzag at max panic
    this.panicTimerSpeedup = 6
    this.panicWaypointRangeMultiplier = 6
    
    // ===== OBSTACLE AVOIDANCE SYSTEM =====
    // Ball 8 detects obstacles ahead (2m range) and changes direction if blocked
    this.obstacleAvoidanceRange = 2.0  // Raycast distance to detect obstacles ahead
    this.obstacleCheckTimer = 0
    this.obstacleCheckInterval = 0.1   // Check for obstacles every 0.1s
    
    // Fallback directions when hitting obstacles (try these in order)
    this.fallbackDirections = [
      new THREE.Vector3(0, 0, 1),   // Forward
      new THREE.Vector3(1, 0, 0),   // Right
      new THREE.Vector3(-1, 0, 0),  // Left
      new THREE.Vector3(0, 0, -1),  // Backward
    ]
    
    // 3. MULTI-WAYPOINT SYSTEM (evasion waypoints around escape path)
    this.waypointSystem = {
      waypoints: [],
      currentWaypointIndex: 0,
      waypointThreshold: 1.5,  // Distance to reach waypoint before switching
      regenerateTimer: 0,
      regenerateInterval: 2.0  // Create new waypoints every 2 seconds
    }

    // ===== FATIGUE SYSTEM =====
    // Ball tự động chuyển giữa trạng thái "normal" và "tired" độc lập
    this.isFatigued = false
    this.fatigueTimer = 0
    this.fatigueNormalDuration = 20.0  // Hoạt động bình thường 25s (tăng từ 10s)
    this.fatigueTiredDuration = 10.0    // Mệt 5s
    this.lastFatigueState = false      // Track state change to trigger sweat effect once
    
    // ===== SWEAT PARTICLE SPAWN (while fatigued) =====
    this.sweatSpawnInterval = 0.3      // Spawn sweat every 0.3 seconds while tired
    this.sweatSpawnTimer = 0           // Current timer
    
    // ===== JUMP SYSTEM =====
    // Mỗi Ball có sai số riêng cho jump interval
    this.jumpCooldown = 2
    this.jumpIntervalBase = 3.0  // Tần suất nhảy cơ bản (3 giây)
    this.jumpIntervalVariance = 1.5  // Sai số ±1.5s (mỗi ball khác nhau)
    this.nextJumpInterval = this.jumpIntervalBase + (Math.random() - 0.5) * this.jumpIntervalVariance * 2
    this.jumpPower = 0.15  // Lực nhảy
    this.isGrounded = true  // Track if ball is on ground
    this.justJumped = false  // Prevent double jump
    this.isAngry = false
  }

  getAngryState() {
    return this.isAngry
  }

  /**
   * ===== EVASION SYSTEM METHODS =====
   */

  /**
   * Calculate panic level (0.0 to 1.0) based on distance to player
   * 0.0 = calm (player far), 1.0 = extreme panic (player very close)
   * Uses smooth gradient instead of binary panic/not panic
   */
  calculatePanicLevel(playerDistance) {
    if (playerDistance >= this.maxCalmDistance) {
      return 0.0  // No panic - player far (>60% of detection range)
    } else if (playerDistance <= this.minPanicDistance) {
      return 1.0  // Maximum panic - player extremely close (<8% of detection range)
    } else {
      // Linear interpolation between calm and panic distances creates smooth gradient
      // This allows Ball 8 behavior to scale smoothly:
      // - At 0.3 panic: slow, predictable (1.0-1.1x speed)
      // - At 0.5 panic: moderate, somewhat predictable (1.75x speed)
      // - At 0.8 panic: fast, hard to predict (2.8x speed)
      // - At 1.0 panic: max speed (3.5x)
      const range = this.maxCalmDistance - this.minPanicDistance
      const level = (this.maxCalmDistance - playerDistance) / range
      return Math.max(0.0, Math.min(1.0, level))
    }
  }

  /**
   * Check if there's an obstacle in the current movement direction
   * If blocked, returns an alternative direction that's clear
   * If clear, returns null
   */
  avoidObstaclesInPath(moveDir) {
    this.obstacleCheckTimer += this.fixedTimeStep
    
    if (this.obstacleCheckTimer < this.obstacleCheckInterval) {
      // Not yet time to check
      return null
    }
    
    this.obstacleCheckTimer = 0
    
    if (!this.scene || !moveDir || moveDir.length() === 0) {
      return null
    }
    
    // Raycast ahead in current movement direction
    const raycaster = new THREE.Raycaster(
      this.mesh.position.clone(),
      moveDir.clone().normalize()
    )
    
    if (this.camera) {
      raycaster.camera = this.camera
    }
    
    const allObjects = this.scene.children.filter(obj => {
      return obj !== this.mesh && obj.name !== 'Player'
    })
    
    const intersections = raycaster.intersectObjects(allObjects, true)
    
    // If obstacle detected within avoidance range
    if (intersections.length > 0 && intersections[0].distance < this.obstacleAvoidanceRange) {
      // Obstacle ahead! Try alternative directions
      for (let fallbackDir of this.fallbackDirections) {
        const testRaycaster = new THREE.Raycaster(
          this.mesh.position.clone(),
          fallbackDir.clone().normalize()
        )
        
        if (this.camera) {
          testRaycaster.camera = this.camera
        }
        
        const testIntersections = testRaycaster.intersectObjects(allObjects, true)
        
        // If this direction is clear, return it
        if (testIntersections.length === 0 || testIntersections[0].distance >= this.obstacleAvoidanceRange) {
          return fallbackDir.clone()
        }
      }
      
      // No clear direction found - return opposite of obstacle hit
      const obstacleNormal = moveDir.clone().negate()
      return obstacleNormal.normalize()
    }
    
    // No obstacle detected
    return null
  }

  /**
   * Generate evasion waypoints around current escape path
   * Creates a path that zigzags sideways while escaping from player
   */
  generateEvasionWaypoints(escapeDirection, playerPos) {
    const waypoints = []
    // Scale waypoint distance based on panic level (longer when panicking)
    const baseWaypointDistance = 3.0
    const waypointDistance = baseWaypointDistance * (1.0 + this.panicLevel * (this.panicWaypointRangeMultiplier - 1.0))
    const waypointCount = 4  // Number of waypoints ahead
    // Lateral deviation also increases with panic for more erratic movement
    const baseLateralDeviation = 2.5
    const lateralDeviation = baseLateralDeviation * (1.0 + this.panicLevel * 0.6)  // Up to 60% more deviation
    
    // Get perpendicular direction for lateral movement
    const perpendicular = new THREE.Vector3(-escapeDirection.z, 0, escapeDirection.x)
    
    for (let i = 1; i <= waypointCount; i++) {
      // Base waypoint ahead on escape path
      const baseWaypoint = this.mesh.position.clone()
        .add(escapeDirection.clone().multiplyScalar(waypointDistance * i))
      
      // Alternate left and right deviation (zigzag pattern)
      const deviation = (i % 2 === 0 ? 1 : -1) * lateralDeviation
      baseWaypoint.add(perpendicular.clone().multiplyScalar(deviation))
      
      waypoints.push(baseWaypoint)
    }
    
    this.waypointSystem.waypoints = waypoints
    this.waypointSystem.currentWaypointIndex = 0
    this.waypointSystem.regenerateTimer = 0
  }

  /**
   * Get next movement direction based on current waypoint
   * Returns direction toward current waypoint
   */
  getWaypointDirection() {
    const waypoints = this.waypointSystem.waypoints
    if (waypoints.length === 0) return null
    
    const currentWaypoint = waypoints[this.waypointSystem.currentWaypointIndex]
    const dirToWaypoint = currentWaypoint.clone()
      .sub(this.mesh.position)
    
    // Check if reached waypoint
    if (dirToWaypoint.length() < this.waypointSystem.waypointThreshold) {
      this.waypointSystem.currentWaypointIndex++
      
      // Loop back to start or just use last waypoint
      if (this.waypointSystem.currentWaypointIndex >= waypoints.length) {
        this.waypointSystem.currentWaypointIndex = waypoints.length - 1
      }
      
      // Recalculate direction to next waypoint
      return this.getWaypointDirection()
    }
    
    return dirToWaypoint.normalize()
  }

  /**
   * Enhanced zigzag pattern - smoother directional changes
   * Applies lateral deviation to escape direction in a wave-like pattern
   * Intensity and speed scale with panic level - predictable at range, erratic when close
   */
  applyZigzagPattern(escapeDirection) {
    // At low panic: slow, predictable zigzag (0.35s interval, 20% strength)
    // At high panic: fast, unpredictable zigzag (0.08s interval, 70% strength)
    const speedupFactor = 1.0 + this.panicLevel * (this.panicTimerSpeedup - 1.0)
    const adjustedInterval = this.baseZigzagInterval / speedupFactor
    
    this.zigzagTimer -= this.fixedTimeStep
    
    if (this.zigzagTimer <= 0) {
      this.zigzagPhase = (this.zigzagPhase + 1) % 4
      this.zigzagTimer = adjustedInterval
    }
    
    // Get perpendicular direction (left/right relative to escape)
    const perpendicular = new THREE.Vector3(-escapeDirection.z, 0, escapeDirection.x)
    
    // Panic amplifies zigzag strength from base 20% up to 70%
    const amplifiedStrength = this.baseZigzagStrength * (1.0 + this.panicLevel * (this.basePanicZigzagMultiplier - 1.0))
    
    let lateralComponent = 0
    switch (this.zigzagPhase) {
      case 0: // Strong left
        lateralComponent = 0.6
        break
      case 1: // Weak right
        lateralComponent = 0.2
        break
      case 2: // Strong right
        lateralComponent = -0.6
        break
      case 3: // Weak left
        lateralComponent = -0.2
        break
    }
    
    // Blend: 70% escape direction + 30% lateral zigzag (amplified by panic)
    const result = escapeDirection.clone().multiplyScalar(0.7)
      .add(perpendicular.clone().multiplyScalar(lateralComponent * amplifiedStrength))
    
    return result.normalize()
  }

  /**
   * Chaos movement - Hỗn loạn nhưng vẫn thoát xa player
   * Used when 0.35 <= panicLevel < 0.85
   * Random immediate direction changes, khó đoán nhưng vẫn cố gắng thoát
   * Speed tăng dần từ chaos phase
   */
  updateChaosMovement(delta, playerPos) {
    // Chaos speeds up direction changes based on panic level
    const speedupFactor = 1.0 + ((this.panicLevel - this.chaosThreshold) / (this.extremePanicThreshold - this.chaosThreshold)) * (this.panicTimerSpeedup - 1.0)
    const adjustedChaosInterval = (0.2 / speedupFactor)  // Change direction frequently, faster as panic increases
    
    this.panicTimer -= delta
    
    // Generate new random direction frequently (every 0.2s base)
    if (this.panicTimer <= 0) {
      // Random direction in full 360°, completely random
      const randomAngle = Math.random() * Math.PI * 2
      
      let chaosDir = new THREE.Vector3(
        Math.cos(randomAngle),
        0,
        Math.sin(randomAngle)
      )
      
      // Keep MINIMAL preference for escaping (only 10-20%, mostly random)
      const escapeDir = this.mesh.position.clone().sub(playerPos).normalize()
      const escapeBlendStrength = 0.5
      
      chaosDir.lerp(escapeDir, escapeBlendStrength)
      
      // Add subtle downward component
      const panicDownwardBias = this.downwardBiasStrength * (1.0 + this.panicLevel * (this.panicDownwardAmplify - 1.0))
      chaosDir.y -= panicDownwardBias * 0.1
      
      this.panicRandomDir.copy(chaosDir.normalize())
      this.panicTimer = adjustedChaosInterval
    }
    
    return this.panicRandomDir.clone()
  }

  /**
   * Panic mode - completely randomized movement in all directions
   * Activated when panicking, but also scales with panic level
   * Higher panic = more chaotic, faster direction changes, more hole-seeking
   */
  updatePanicMode(delta, playerPos) {
    // Panic level speeds up the random direction changes
    const speedupFactor = 1.0 + this.panicLevel * (this.panicTimerSpeedup - 1.0)
    const adjustedPanicInterval = (0.3 / speedupFactor)  // Faster at high panic
    
    this.panicTimer -= delta
    
    // Generate new random direction more frequently at higher panic levels
    if (this.panicTimer <= 0) {
      // Random direction in full 360°
      const randomAngle = Math.random() * Math.PI * 2
      
      // Create random direction
      let randomDir = new THREE.Vector3(
        Math.cos(randomAngle),
        0,
        Math.sin(randomAngle)
      )
      
      // At high panic levels (>0.6), don't worry about direction away from player
      // Just flee chaotically. At lower panic, prefer escape direction.
      if (this.panicLevel < 0.6) {
        const dirFromPlayer = this.mesh.position.clone().sub(playerPos).normalize()
        const dotProduct = randomDir.dot(dirFromPlayer)
        
        // If pointing toward player, flip it
        if (dotProduct < 0.3) {
          randomDir.multiplyScalar(-1)
        }
      }
      
      this.panicRandomDir.copy(randomDir.normalize())
      this.panicTimer = adjustedPanicInterval
    }
    
    return this.panicRandomDir.clone()
  }

  /**
   * Combined evasion behavior - 3 PHASE SYSTEM
   * Phase 1 (0.0-0.35): Structured escape - calm, predictable, vận tốc bình thường
   * Phase 2 (0.35-0.85): Chaotic escape - hỗn loạn, khó đoán, tăng tốc độ dần
   * Phase 3 (0.85-1.0): Extreme panic - thoát cực nhanh & mạnh, càng gần càng mạnh
   */
  updateEvasionBehavior(delta, playerPos) {
    const playerDist = this.mesh.position.distanceTo(playerPos)
    
    // Calculate panic level (0.0 to 1.0)
    this.panicLevel = this.calculatePanicLevel(playerDist)
    
    // Base escape direction (always away from player)
    const escapeDir = this.mesh.position.clone()
      .sub(playerPos)
      .normalize()
    
    // PHASE 3: EXTREME PANIC (panicLevel > 0.85) - Lăng tăng tối đa
    if (this.panicLevel > this.extremePanicThreshold) {
      this.isPanicking = true
      return this.updatePanicMode(delta, playerPos)
    }
    
    this.isPanicking = false
    
    // PHASE 2: CHAOS (0.35 <= panicLevel <= 0.85) - Hỗn loạn, khó đoán
    if (this.panicLevel > this.chaosThreshold) {
      return this.updateChaosMovement(delta, playerPos)
    }
    
    // PHASE 1: NORMAL ESCAPE (panicLevel <= 0.35) - Bình thường, cấu trúc, chậm
    // ===== WAYPOINT + ZIGZAG BLEND WITH PANIC SCALING =====
    // Use structured waypoint system for calm, predictable movement
    this.waypointSystem.regenerateTimer += delta
    if (this.waypointSystem.regenerateTimer >= this.waypointSystem.regenerateInterval) {
      this.generateEvasionWaypoints(escapeDir, playerPos)
    }
    
    // Get waypoint direction
    const waypointDir = this.getWaypointDirection()
    
    // Enhanced zigzag on top of waypoint direction (minimal intensity)
    const zigzagDir = this.applyZigzagPattern(escapeDir)
    
    // Phase 1: Mostly waypoints (80%) + minimal zigzag (20%)
    // Structured and calm when player is far
    const waypointWeight = 0.8
    const zigzagWeight = 0.2
    
    if (waypointDir) {
      const blendedDir = waypointDir.clone().multiplyScalar(waypointWeight)
        .add(zigzagDir.multiplyScalar(zigzagWeight))
      return blendedDir.normalize()
    }
    
    return zigzagDir
  }

  /**
   * DELETE MESH CODE - Moved to Inspector.js or Game.js
   */

  /**
   * Update fatigue state: toggle between normal (25s) and tired (5s)
   * Spawn sweat particle effect continuously while fatigued
   */
  updateFatigueState(delta) {
    this.fatigueTimer += delta
    
    const targetDuration = this.isFatigued 
      ? this.fatigueTiredDuration 
      : this.fatigueNormalDuration
    
    if (this.fatigueTimer >= targetDuration) {
      this.isFatigued = !this.isFatigued
      this.fatigueTimer = 0
      console.debug(`[Ball8AI] Ball fatigue state changed: ${this.isFatigued ? 'TIRED' : 'NORMAL'}`)
    }

    // ===== CONTINUOUS SWEAT SPAWNING WHILE FATIGUED =====
    if (this.isFatigued && this.particleManager && this.mesh) {
      this.sweatSpawnTimer -= delta
      
      if (this.sweatSpawnTimer <= 0) {
        this.particleManager.spawn('sweat', this.mesh.position.clone())
        this.sweatSpawnTimer = this.sweatSpawnInterval  // Reset timer
      }
    } else {
      // Reset sweat timer when not fatigued
      this.sweatSpawnTimer = 0
    }
  }

  /**
   * Handle jump mechanic: Ball nhảy lâu lâu khi KHÔNG mệt
   * Mỗi Ball có sai số jump interval riêng
   * IMPORTANT: Chỉ nhảy khi trên đất (ground contact)
   */
  updateJump(delta) {
    // Nếu đang mệt → không nhảy
    if (this.isFatigued) {
      this.jumpCooldown = 0
      return
    }

    // Check ground contact: vertical velocity near zero + didn't just jump
    const verticalVelocity = this.body.velocity.y
    
    // If falling from jump, reset justJumped flag
    if (verticalVelocity < -0.1) {
      this.justJumped = false
    }
    
    // Ball is grounded if vertical velocity is near zero and not just jumped
    this.isGrounded = Math.abs(verticalVelocity) < 0.1 && !this.justJumped

    // Countdown jump cooldown
    this.jumpCooldown -= delta
    
    // Jump only if: not tired + on ground + cooldown ready
    if (this.jumpCooldown <= 0 && this.isGrounded) {
      // Áp dụng impulse theo phương Y (nhảy)
      const jumpImpulse = new CANNON.Vec3(0, this.jumpPower, 0)
      this.body.applyImpulse(jumpImpulse, this.body.position)
      this.justJumped = true
      
      // Reset với sai số mới cho lần nhảy tiếp theo
      this.jumpCooldown = this.jumpIntervalBase + (Math.random() - 0.5) * this.jumpIntervalVariance * 2
      console.debug(`[Ball8AI] Ball jumped! Next jump in ${this.jumpCooldown.toFixed(1)}s`)
    }
  }

  /**
   * CHECK ALL NEARBY BALL 8s AND FIND IF ANY VIOLATE MINIMUM SAFE DISTANCE
   * Player destruction is handled by DestroySystem.checkCharacterDestroyConditions
   */

  /**
   * Check ALL nearby Ball 8s and find if any violate minimum safe distance
   * Returns closest Ball 8 that's too close (< groupingMinDistance), or null
   * IMPORTANT: Respects distance to individual Ball 8s, not group center
   */
  getClosestViolatingBall8(syncList) {
    let closestBall8 = null
    let closestDist = Infinity

    syncList.forEach(other => {
      if (other.name === 'Ball 8' && other.mesh && other.mesh !== this.mesh) {
        const dist = this.mesh.position.distanceTo(other.mesh.position)
        // Check if this Ball 8 is too close (violates spacing rule)
        if (dist < BALL8_AI_CONFIG.groupingMinDistance && dist < closestDist) {
          closestBall8 = other
          closestDist = dist
        }
      }
    })

    return closestBall8
  }

  
  /**
   * Count Ball 8s within the detection range
   * Returns total count including self
   * Uses: BALL8_AI_CONFIG.detectionRange
   */
  countNearbyBall8s(syncList) {
    let count = 1 // Include self
    
    syncList.forEach(other => {
      if (other.name === 'Ball 8' && other.mesh && other.mesh !== this.mesh) {
        const dist = this.mesh.position.distanceTo(other.mesh.position)
        if (dist < this.detectionRange) {
          count++
        }
      }
    })
    
    return count
  }


  /**
   * Get center position of nearby Ball 8s (for grouping movement)
   */
  getGroupCenter(syncList) {
    let centerPos = this.mesh.position.clone()
    let count = 1 // self
    
    syncList.forEach(other => {
      if (other.name === 'Ball 8' && other.mesh && other.mesh !== this.mesh) {
        const dist = this.mesh.position.distanceTo(other.mesh.position)
        if (dist < this.detectionRange) {
          centerPos.add(other.mesh.position)
          count++
        }
      }
    })
    
    if (count > 1) {
      centerPos.divideScalar(count)
    }
    
    return centerPos
  }

  /**
   * Check if this Ball 8's trigger zone overlaps with another Ball 8's trigger zone
   * Trigger zones are circles with radius = groupingMinDistance
   * Two circles overlap if distance between centers < 2 * radius
   * Returns true if ANY other Ball 8's trigger zone overlaps with this one
   */
  checkTriggerZoneOverlapWithOtherBalls(syncList) {
    const triggerRadius = BALL8_AI_CONFIG.groupingMinDistance
    const overlapThreshold = triggerRadius * 2  // Circles overlap when dist < 2*radius
    
    for (const other of syncList) {
      if (other.name === 'Ball 8' && other.mesh && other.mesh !== this.mesh) {
        const dist = this.mesh.position.distanceTo(other.mesh.position)
        // Trigger zones overlap if distance between centers < 2*radius
        if (dist < overlapThreshold) {
          return true  // Overlap detected
        }
      }
    }
    
    return false  // No overlap
  }

  /**
   * Update Ball 8 AI behavior
   * Returns bodyYaw or null
   */
  update(delta, syncList) {
    this.timeAlive += delta
    this.isAngry = false

    // ✨ NEW: Handle 3-second startup delay - ball 8 can't move during this time
    if (!this.canMove && this.timeAlive < this.startupDelayDuration) {
      // Ball 8 just spawned - stop all movement for startup delay
      this.body.velocity.x = 0
      this.body.velocity.z = 0
      console.debug(`[Ball8AI] Ball startup delay: ${this.timeAlive.toFixed(2)}s / ${this.startupDelayDuration}s`)
      return this.bodyYaw
    } else if (!this.canMove && this.timeAlive >= this.startupDelayDuration) {
      // Startup delay finished - now ball 8 can move
      this.canMove = true
      console.log(`%c[Ball8AI] ✨ Startup delay finished! Ball 8 can now move!`, 'color: #ffff00; font-weight: bold')
    }

    // ===== FATIGUE & JUMP UPDATES =====
    // Cập nhật trạng thái mệt và nhảy TRƯỚC hết
    this.updateFatigueState(delta)
    this.updateJump(delta)

    // ===== SKIP ALL MOVEMENT IF FATIGUED =====
    // Khi mệt: không di chuyển, không nhảy, không grouping, không chạy trốn
    if (this.isFatigued) {
      // Stop all velocity when fatigued
      this.body.velocity.x = 0
      this.body.velocity.z = 0
      
      console.debug(`[Ball8AI] Ball is FATIGUED - stopping movement`)
      return this.bodyYaw
    }

    // Find nearest player
    let nearestPlayer = null
    let minPlayerDistance = Infinity

    syncList.forEach(other => {
      if (other.name === 'Player' && other.mesh) {
        const dist = this.mesh.position.distanceTo(other.mesh.position)
        if (dist < minPlayerDistance) {
          minPlayerDistance = dist
          nearestPlayer = other
        }
      }
    })

    // Count nearby Ball 8s in trigger mesh
    this.groupedBalls8Count = this.countNearbyBall8s(syncList)
    this.isGrouped = this.groupedBalls8Count >= this.groupThreshold
    this.groupCenter = this.getGroupCenter(syncList)

    // Player destruction when 3+ Ball 8s attack is handled by DestroySystem.checkCharacterDestroyConditions
    // (see destroy.js for the actual implementation)

    // Player is visible if within detectionRange
    const playerVisible = nearestPlayer && minPlayerDistance <= this.detectionRange

    // Stuck detection
    const currentPos = this.mesh.position.clone()
    const movedDist = currentPos.distanceTo(this.lastPos)
    const speedFactor = this.baseMaxSpeed * delta
    const stuckThreshold = speedFactor * 0.3

    if (movedDist < stuckThreshold) {
      this.stuckTimer += delta
    } else {
      this.stuckTimer = 0
    }
    this.lastPos.copy(currentPos)

    let moveDir = new THREE.Vector3()

    // BEHAVIOR: If 3+ Ball 8s grouped, chase player instead of fleeing
    // Must have at least groupThreshold Ball 8s (default 3) to be considered grouped and attack
    if (this.isGrouped && playerVisible && this.groupedBalls8Count >= this.groupThreshold) {
      this.isAngry = true
      // Chase behavior - grouped balls attack the player with increased speed
      const playerPos = nearestPlayer.mesh.position
      
      // Check if ANY Ball 8 is too close - respect individual spacing, not group center
      const tooCloseBall8 = this.getClosestViolatingBall8(syncList)
      
      if (tooCloseBall8) {
        // There's a Ball 8 too close - push away from it while still chasing player
        const pushAwayDir = this.mesh.position.clone()
          .sub(tooCloseBall8.mesh.position)
          .normalize()
        
        // Split direction: 60% push away from violating Ball 8, 40% toward player
        moveDir.subVectors(playerPos, this.mesh.position).normalize()
        moveDir.multiplyScalar(0.4)
        moveDir.add(pushAwayDir.multiplyScalar(0.6))
        moveDir.normalize()
        
        const slowChaseSpeed = this.baseMaxSpeed * 0.8 // Reduced speed when too close
        this.body.velocity.x = moveDir.x * slowChaseSpeed
        this.body.velocity.z = moveDir.z * slowChaseSpeed
      } else {
        // No spacing violations - attack player normally
        moveDir.subVectors(playerPos, this.mesh.position).normalize()

        // Add slight zigzag for less predictable movement
        this.randomMoveTimer -= delta
        if (this.randomMoveTimer <= 0) {
          this.randomMoveTimer = 0.5 + Math.random() * 1
          this.randomDir.set(
            Math.random() - 0.5,
            0,
            Math.random() - 0.5
          ).normalize()
        }

        const zigzag = this.randomDir.clone().multiplyScalar(0.2)
        moveDir.add(zigzag).normalize()
        
        // Apply faster speed when grouped and chasing - more threatening
        const chaseSpeed = this.baseMaxSpeed * 1.3 // Grouped chase is faster
        this.body.velocity.x = moveDir.x * chaseSpeed
        this.body.velocity.z = moveDir.z * chaseSpeed
      }
    } else if (playerVisible) {
      // Run away behavior: ALWAYS maintain max speed to keep distance
      // Only shift to panic mode when extremely close to find escape routes
      const playerPos = nearestPlayer.mesh.position
      
      // Use combined evasion system with 3 phases
      moveDir = this.updateEvasionBehavior(delta, playerPos)

      // Speed strategy: 3-PHASE SCALING based on panicLevel
      // Phase 1 (0.0-0.35): SLOW 0.5-0.8x, calm & predictable (dễ đoán)
      // Phase 2 (0.35-0.85): MEDIUM 0.8-1.5x, hỗn loạn (khó đoán)
      // Phase 3 (0.85-1.0): FAST 1.5-4.5x, lăng tăng & mạnh (rất khó đoán, mạnh + nhanh)
      
      let speedMultiplier = 1
      
      if (this.panicLevel <= this.chaosThreshold) {
        // PHASE 1: Calm escape - slow speed (0.5-0.8x)
        speedMultiplier = 0.5 + (this.panicLevel / this.chaosThreshold) * 0.3  // 0.5 to 0.8
      } else if (this.panicLevel <= this.extremePanicThreshold) {
        // PHASE 2: Chaos escape - medium speed (0.8-1.5x)
        const chaosProgress = (this.panicLevel - this.chaosThreshold) / (this.extremePanicThreshold - this.chaosThreshold)
        speedMultiplier = 0.8 + chaosProgress * (this.chaosSpeedMultiplier - 0.8)  // 0.8 to 1.5
      } else {
        // PHASE 3: Extreme panic - fast speed (1.5-4.5x)
        // Exponential curve: starts at 1.5x, accelerates to 4.5x as player gets closer
        const panicProgress = (this.panicLevel - this.extremePanicThreshold) / (1.0 - this.extremePanicThreshold)
        const exponentialPanic = Math.pow(panicProgress, 1.5)
        speedMultiplier = this.chaosSpeedMultiplier + (this.basePanicSpeedMultiplier - this.chaosSpeedMultiplier) * exponentialPanic
      }
      
      this.currentSpeedMultiplier = speedMultiplier

      // Add strong attempt to group with other Ball 8s while fleeing
      // Only group if trigger zones don't overlap yet AND panic not too high
      if (this.groupedBalls8Count > 1 && this.panicLevel < 0.6) {
        // Use trigger zone overlap check instead of distance
        const triggerZonesOverlap = this.checkTriggerZoneOverlapWithOtherBalls(syncList)
        
        // Only chase group if trigger zones DON'T overlap AND not too panicked
        if (!triggerZonesOverlap && !this.isPanicking) {
          // Trigger zones separate - move toward group center while fleeing
          const groupDir = this.groupCenter.clone()
            .sub(this.mesh.position)
            .normalize()
          
          // Blend: 60% enhanced evasion, 40% move toward group (reduced when panicking)
          moveDir.multiplyScalar(0.6)
          moveDir.add(groupDir.multiplyScalar(0.4))
          moveDir.normalize()
        }
        // Otherwise panic pure evasion or grouped overlap handled below
      }
    } else {
      // No player visible - Ball 8s can still group (detect and move toward each other)
      if (this.groupedBalls8Count > 1) {
        // Move towards other Ball 8s in group, but only if trigger zones don't overlap yet
        // Use trigger zone overlap instead of distance to group center
        const triggerZonesOverlap = this.checkTriggerZoneOverlapWithOtherBalls(syncList)
        
        // Check if ANY Ball 8 is too close - if so, push away from it
        const tooCloseBall8 = this.getClosestViolatingBall8(syncList)
        
        if (tooCloseBall8) {
          // A Ball 8 is too close - push away from it instead of toward group
          const pushAwayDir = this.mesh.position.clone()
            .sub(tooCloseBall8.mesh.position)
            .normalize()
          
          moveDir.copy(pushAwayDir)
          this.body.velocity.x = moveDir.x * this.baseMaxSpeed * 0.4
          this.body.velocity.z = moveDir.z * this.baseMaxSpeed * 0.4
        } else if (!triggerZonesOverlap) {
          // TRIGGER ZONES DON'T OVERLAP - chase group to enter it
          moveDir.subVectors(this.groupCenter, this.mesh.position).normalize()
          const groupSpeed = this.baseMaxSpeed * BALL8_AI_CONFIG.groupingSpeedFactor // Full speed approach
          this.body.velocity.x = moveDir.x * groupSpeed
          this.body.velocity.z = moveDir.z * groupSpeed
        } else {
          // TRIGGER ZONES OVERLAP - already grouped, no need to chase anymore
          // STOP moving to allow physics to settle
          this.body.velocity.x = 0
          this.body.velocity.z = 0
          
          // Add tiny random jitter to prevent exact stacking
          const jitterAmount = 0.1
          this.body.velocity.x += (Math.random() - 0.5) * jitterAmount
          this.body.velocity.z += (Math.random() - 0.5) * jitterAmount
        }
      } else {
        // Only one Ball 8 or no others nearby - just random wander
        this.randomMoveTimer -= delta
        if (this.randomMoveTimer <= 0) {
          this.randomMoveTimer = 2 + Math.random() * 2
          this.randomDir.set(
            Math.random() - 0.5,
            0,
            Math.random() - 0.5
          ).normalize()
        }
        moveDir.copy(this.randomDir)
      }
    }

    // ===== OBSTACLE AVOIDANCE CHECK =====
    // Check if current direction hits an obstacle, if so use alternative direction
    if (moveDir.length() > 0) {
      const alternativeDir = this.avoidObstaclesInPath(moveDir)
      if (alternativeDir) {
        // Obstacle detected ahead, use alternative direction
        moveDir.copy(alternativeDir)
      }
    }

    // Handle stuck by changing direction
    if (this.stuckTimer > 0.5) {
      moveDir.set(
        Math.random() - 0.5,
        0,
        Math.random() - 0.5
      ).normalize()
      this.stuckTimer = 0
    }

    // Update rotation to face movement direction
    if (moveDir.length() > 0) {
      const targetYaw = Math.atan2(moveDir.x, moveDir.z)
      let diff = targetYaw - this.bodyYaw

      if (diff > Math.PI) diff -= Math.PI * 2
      if (diff < -Math.PI) diff += Math.PI * 2

      this.bodyYaw += diff * this.rotationSmooth * this.fixedTimeStep
    }
    
    this.mesh.rotation.y = this.bodyYaw

    // Special cases where velocity already set directly - skip normal acceleration
    if (this.isGrouped && playerVisible) {
      // Grouped attack already set velocity directly
      return this.bodyYaw
    }
    
    if (!this.isGrouped && this.groupedBalls8Count > 1 && !playerVisible) {
      // Grouping behavior already set velocity directly
      return this.bodyYaw
    }
    
    // If trigger zones overlap (already grouped) while player visible, skip acceleration
    if (playerVisible && this.groupedBalls8Count > 1) {
      const triggerZonesOverlap = this.checkTriggerZoneOverlapWithOtherBalls(syncList)
      if (triggerZonesOverlap) {
        // Trigger zones overlap - velocity already set, don't apply acceleration
        return this.bodyYaw
      }
    }

    // Apply normal velocity with acceleration for other behaviors (escape + grouping blend, random wander, etc)
    // Apply speed multiplier if set (e.g., during flee with panic level)
    const effectiveMaxSpeed = this.baseMaxSpeed * this.currentSpeedMultiplier
    const targetVelX = moveDir.x * effectiveMaxSpeed
    const targetVelZ = moveDir.z * effectiveMaxSpeed

    this.body.velocity.x +=
      (targetVelX - this.body.velocity.x) *
      this.acceleration *
      this.fixedTimeStep

    this.body.velocity.z +=
      (targetVelZ - this.body.velocity.z) *
      this.acceleration *
      this.fixedTimeStep

    // Reset speed multiplier for next frame
    this.currentSpeedMultiplier = 1.0

    return this.bodyYaw
  }

}
