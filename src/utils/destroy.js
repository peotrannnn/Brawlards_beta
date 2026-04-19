import * as THREE from "three"

const DESTROY_SYSTEM_CONFIG = {
  destroyTimeout: 3000, // ms
  maxDestroyPerFrame: 6,
  clothKillOffset: 0.1,
  playerFallEnterOffset: 0.05,
  playerFallExitOffset: 0.35,
  playerFallSpawnCooldownSec: 60,
  debugLogs: false,
};

export class DestroySystem {
  constructor({ syncList, world, scene, hitboxManager = null, particleManager = null }) {
    this.syncList = syncList;
    this.world = world;
    this.scene = scene;
    this.hbManager = hitboxManager;
    this.particleManager = particleManager;

    this.planeY = null;
    this.pending = new Map();
    this.onDestroyCallback = null;
    this.onPlayerFallCallback = null;
    this.spawnCallback = null;
    this.tableObj = null;
    this.tableOffset = null;
    this.tableSize = { w: 0, d: 0 };
    
    // Track destroyed characters để tránh multiple destroy attempts
    this.destroyedCharacters = new Set();
    
    // Track if player has fallen to prevent spawning multiple guys
    this.playerFallTracking = new Set();
    this.playerFallState = new Map();
    this.playerFallSpawnCooldownUntil = new Map();
    
    // Track timers for EACH Guy (Map<GuyEntry, timeSeconds>)
    this.guyTimers = new Map();
    this.GUY_NO_PLAYER_TIMEOUT = 10.0;
    
    // Track timers for EACH Compune in disconnecting state (Map<CompuneEntry, timeSeconds>)
    this.compuneTimers = new Map();
    this.COMPUNE_DISCONNECT_TIMEOUT = 10.0;

    this.destroyQueue = [];
    this.destroyQueueSet = new Set();

    // Reuse vectors in hot-path checks.
    this._tmpGuyPos = new THREE.Vector3();
    this._tmpPlayerPos = new THREE.Vector3();
    this._tmpBall8Pos = new THREE.Vector3();
    
    this.lastUpdateTime = null;
  }

  _debugLog(...args) {
    if (!DESTROY_SYSTEM_CONFIG.debugLogs) return;
    console.debug(...args);
  }

  _queueDestroy(entry) {
    if (!entry || this.destroyQueueSet.has(entry)) return;
    this.destroyQueue.push(entry);
    this.destroyQueueSet.add(entry);
  }

  _flushDestroyQueue() {
    let processed = 0;
    while (this.destroyQueue.length > 0 && processed < DESTROY_SYSTEM_CONFIG.maxDestroyPerFrame) {
      const entry = this.destroyQueue.shift();
      this.destroyQueueSet.delete(entry);
      this._destroyEntry(entry);
      processed += 1;
    }
  }

  _computePlaneFromTable() {
    if (!this.tableObj) return null;
    const marker = this.tableObj.getObjectByName && this.tableObj.getObjectByName("KillPlane");
    if (marker) {
      const worldPos = new THREE.Vector3();
      marker.getWorldPosition(worldPos);
      return worldPos.y;
    }
    if (this.tableOffset == null) return null;
    const pos = new THREE.Vector3();
    this.tableObj.getWorldPosition(pos);
    return pos.y + this.tableOffset;
  }

  setPlaneHeight(y, width, depth) {
    this.planeY = (typeof y === 'number') ? y : null;
    if (this.hbManager && this.hbManager.setDestructionPlane) {
      if (this.planeY == null) {
        this.hbManager.setDestructionPlane(null);
      } else {
        this.hbManager.setDestructionPlane(this.planeY, width, depth);
      }
    }
    this._debugLog('[destroy] setPlaneHeight', this.planeY, width, depth);
  }

  _formatEntryName(entry) {
    if (!entry || !entry.name) return '<unknown>'
    const name = entry.name
    if (name === 'Cue Ball') return 'Cue Ball'
    if (name === 'Bowling Ball') return 'Bowling Ball'
    if (name.startsWith('Ball ')) {
      const num = parseInt(name.slice(5), 10)
      if (!isNaN(num)) {
        const type = num >= 9 ? 'stripe' : 'solid'
        return `Ball ${num} (${type})`
      }
    }
    return name
  }

  _scheduleDestroy(entry) {
    if (this.pending.has(entry)) return;
    const timeout = setTimeout(() => {
      this._queueDestroy(entry);
    }, DESTROY_SYSTEM_CONFIG.destroyTimeout);
    this.pending.set(entry, timeout);
  }

  _cancelDestroy(entry) {
    if (!this.pending.has(entry)) return;
    clearTimeout(this.pending.get(entry));
    this.pending.delete(entry);
  }

  _destroyEntry(entry) {
    if (!entry) return;
    // Clear any pending timeout if it exists
    if (this.pending.has(entry)) {
      clearTimeout(this.pending.get(entry));
      this.pending.delete(entry);
    }
    this.destroyQueueSet.delete(entry);
    if (entry.body) {
      // Xóa Trigger Body đi kèm nếu có
      if (entry.body.userData && entry.body.userData.triggerBody) {
          const tb = entry.body.userData.triggerBody;
          this.world.removeBody(tb);
          if (this.hbManager && this.hbManager.removeHitboxForObject) {
              this.hbManager.removeHitboxForObject({ body: tb });
          }
      }
      
      // Clean up Ball8AI trigger mesh if exists
      if (entry.body.userData && entry.body.userData.ball8AI) {
        const ball8AI = entry.body.userData.ball8AI;
        if (ball8AI.dispose) {
          ball8AI.dispose();
        }
      }
      
      this.world.removeBody(entry.body);
    }
    if (entry.mesh) {
      this.scene.remove(entry.mesh);
    }
    if (this.hbManager && this.hbManager.removeHitboxForObject) {
      this.hbManager.removeHitboxForObject(entry);
    }
    const idx2 = this.syncList.indexOf(entry);
    if (idx2 !== -1) this.syncList.splice(idx2, 1);
    if (this.guyTimers.has(entry)) this.guyTimers.delete(entry); // Cleanup timer
    if (this.destroyedCharacters.has(entry)) this.destroyedCharacters.delete(entry);
    if (entry && entry.name === 'Player') {
      this.playerFallTracking.delete(entry);
      this.playerFallState.delete(entry);
      this.playerFallSpawnCooldownUntil.delete(entry);
    }
    // Remove all timers and pending timeouts for this entry
    if (this.compuneTimers.has(entry)) this.compuneTimers.delete(entry);
    if (this.pending.has(entry)) {
      clearTimeout(this.pending.get(entry));
      this.pending.delete(entry);
    }
    // Remove from syncList if present
    const idx = this.syncList.indexOf(entry);
    if (idx !== -1) this.syncList.splice(idx, 1);
    if (this.onDestroyCallback) {
      try { this.onDestroyCallback(entry); } catch (e) { }
    }
  }

  update() {
    // Calculate delta from last update
    const now = performance.now() / 1000; // Convert to seconds
    let delta = 0;
    if (this.lastUpdateTime !== null) {
      delta = now - this.lastUpdateTime;
    }
    this.lastUpdateTime = now;

    // Check character destroy conditions (Player vs Guy)
    this.checkCharacterDestroyConditions(delta);
    this._flushDestroyQueue();

    const newPlane = this._computePlaneFromTable();
    if (newPlane !== null) {
      if (newPlane !== this.planeY) {
        const w = this.tableSize.w ? this.tableSize.w + 2 : undefined;
        const d = this.tableSize.d ? this.tableSize.d + 2 : undefined;
        this.setPlaneHeight(newPlane, w, d);
        this.planeY = newPlane;
      } else if (this.hbManager && this.hbManager.updateDestructionPlane) {
        this.hbManager.updateDestructionPlane(this.planeY);
      }
    }

    if (this.planeY == null || isNaN(this.planeY)) {
      if (isNaN(this.planeY)) {

        this.planeY = null;
      }
      return;
    }

    // Check balls - destroy immediately if below plane (no 3s delay)
    // Except Ball 8 which is only destroyed by cue stroke
    this.syncList.forEach(entry => {
      if (!entry || !entry.body) return;
      const name = entry.name || ''
      if (!name.includes('Ball')) return
      if (name === 'Ball 8') return  // Ball 8 despawns via cue stroke only
      if (entry.mesh?.userData?.isBowlingBall || name === 'Bowling Ball' || name.includes('BowlingBall')) return

      if (entry.body.position.y < this.planeY) {
        // Destroy immediately (no 3 second delay like other objects)
        this._queueDestroy(entry);
      }
    })

    // Check player - spawn a guy when player falls below plane
    const players = this.syncList.filter(e => e && e.name === 'Player' && !this.destroyedCharacters.has(e));
    players.forEach(player => {
      if (!player || !player.body) return;

      const y = player.body.position.y;
      const enterThreshold = this.planeY - DESTROY_SYSTEM_CONFIG.playerFallEnterOffset;
      const exitThreshold = this.planeY + DESTROY_SYSTEM_CONFIG.playerFallExitOffset;
      const wasBelow = this.playerFallState.get(player) || false;

      if (wasBelow) {
        // Player climbed above safe threshold => allow next fall to spawn again.
        if (y > exitThreshold) {
          this.playerFallState.set(player, false);
          this.playerFallTracking.delete(player);
        }
        return;
      }

      // Trigger only on downward crossing into kill zone.
      if (y < enterThreshold && !this.playerFallTracking.has(player)) {
        this.playerFallTracking.add(player);
        this.playerFallState.set(player, true);

        const cooldownUntil = this.playerFallSpawnCooldownUntil.get(player) || 0;
        if (now < cooldownUntil) {
          const remaining = (cooldownUntil - now).toFixed(1);
          this._debugLog(`[destroy] Player crossed kill plane but spawn is on cooldown (${remaining}s left)`);
          return;
        }

        this.playerFallSpawnCooldownUntil.set(player, now + DESTROY_SYSTEM_CONFIG.playerFallSpawnCooldownSec);
        this._debugLog('[destroy] Player crossed below kill plane - spawning guy at water leak');
        if (this.spawnCallback) {
          try {
            this.spawnCallback(player);
          } catch (e) {

          }
        }
      }
    })
  }

  setHitboxManager(mgr) {
    this.hbManager = mgr;
    if (this.hbManager && typeof this.planeY === 'number' && this.hbManager.setDestructionPlane) {
      this.hbManager.setDestructionPlane(this.planeY, this.tableSize.w ? this.tableSize.w + 2 : undefined, this.tableSize.d ? this.tableSize.d + 2 : undefined);
    }
  }

  setTable(obj) {
    this.tableObj = obj;
    if (obj && obj.userData && obj.userData.tableDimensions) {
      const dims = obj.userData.tableDimensions;
      this.tableOffset = (typeof dims.baseY === 'number' && typeof dims.baseHalfHeight === 'number')
        ? dims.baseY + dims.baseHalfHeight : null;
      this.tableSize.w = dims.width || 0;
      this.tableSize.d = dims.depth || 0;
      const firstY = this._computePlaneFromTable();
      this.setPlaneHeight(firstY, this.tableSize.w + 2, this.tableSize.d + 2);
      this.planeY = firstY;
    } else {
      this.tableOffset = null;
      this.tableSize = { w: 0, d: 0 };
      this.setPlaneHeight(null);
      this.planeY = null;
    }
  }

  setOnDestroy(cb) {
    this.onDestroyCallback = typeof cb === 'function' ? cb : null;
  }

  setSpawnCallback(cb) {
    this.spawnCallback = typeof cb === 'function' ? cb : null;
  }

  /**
   * Set particle manager để spawn effects khi destroy
   */
  setParticleManager(pm) {
    this.particleManager = pm;
  }

  /**
   * ✨ NEW: Public method to destroy an object immediately (used by Scene1Manager for ball reset)
   * @param {Object} entry - The syncList entry to destroy
   */
  destroyObject(entry) {
    if (!entry) return;
    this._queueDestroy(entry);
  }

  /**
   * Check character destroy conditions:
   * - Player destroyed: Small trigger chạm small trigger của Guy
   * - Guy destroyed: Không có Player trong vòng large trigger của Guy trong 10 giây
   */
  checkCharacterDestroyConditions(delta = 0) {
    // Lọc danh sách tất cả Player, Guy, và Compune hiện có (chưa bị destroy)
    const players = this.syncList.filter(e => e.name === 'Player' && !this.destroyedCharacters.has(e));
    const guys = this.syncList.filter(e => e.name === 'Guy' && !this.destroyedCharacters.has(e));
    const compunes = this.syncList.filter(e => e.name === 'Compune' && !this.destroyedCharacters.has(e));

    this._debugLog(`[destroy] checkCharacterDestroyConditions: ${players.length} players, ${guys.length} guys, ${compunes.length} compunes`);

    // 1. Check Player Destroyed (Nếu Player chạm vào Small Trigger của BẤT KỲ Guy nào)
    for (const guy of guys) {
      const guySmallTrigger = guy.mesh?.children.find(c => c.name === 'TriggerZone_Small');
      if (!guySmallTrigger) continue;

      const guyPos = this._tmpGuyPos;
      guySmallTrigger.getWorldPosition(guyPos);
      const guyRadius = guySmallTrigger.geometry?.parameters?.radius || 1.5;

      for (const player of players) {
        if (this.destroyedCharacters.has(player)) continue;

        // Lấy vị trí và bán kính của Player (ưu tiên dùng trigger nếu có)
        let playerPos = player.mesh.position;
        let playerRadius = 0.5; // Default radius

        const playerSmallTrigger = player.mesh?.children.find(c => c.name === 'TriggerZone_Small');
        if (playerSmallTrigger) {
          const pPos = this._tmpPlayerPos;
          playerSmallTrigger.getWorldPosition(pPos);
          playerPos = pPos;
          playerRadius = playerSmallTrigger.geometry?.parameters?.radius || 1.5;
        }

        const dist = playerPos.distanceTo(guyPos);
        if (dist < (guyRadius + playerRadius)) {
          this.destroyCharacter(player);
        }
      }
    }

    // 2. Guy Auto-Despawn: Guy despawn nếu không có Player trong large trigger trong 10 giây
    for (const guy of guys) {
      // Get Guy's large trigger zone
      const guyLargeTrigger = guy.mesh?.children.find(c => c.name === 'TriggerZone_Large');
      if (!guyLargeTrigger) continue;

      const guyPos = this._tmpGuyPos;
      guyLargeTrigger.getWorldPosition(guyPos);
      const guyLargeRadius = guyLargeTrigger.geometry?.parameters?.radius || 40;

      // Check if any Player is within large trigger range
      let playerInRange = false;
      for (const player of players) {
        if (this.destroyedCharacters.has(player)) continue;

        const playerPos = player.mesh.position;
        const dist = playerPos.distanceTo(guyPos);
        
        if (dist < guyLargeRadius) {
          playerInRange = true;
          break;
        }
      }

      // Khởi tạo timer nếu chưa có
      if (!this.guyTimers.has(guy)) {
        this.guyTimers.set(guy, 0);
        this._debugLog('[destroy] Guy spawned, timer initialized');
      }

      // Nếu có Player trong range: reset timer (keep waiting)
      // Nếu không có Player: tăng timer, khi >= 10s thì despawn
      let newTime = this.guyTimers.get(guy);
      
      if (playerInRange) {
        // Reset timer vì Player đã xuất hiện trong range
        newTime = 0;
      } else {
        // Tăng timer vì không có Player
        newTime += delta;
      }
      
      this.guyTimers.set(guy, newTime);

      // Despawn sau 10 giây không có Player
      if (newTime >= this.GUY_NO_PLAYER_TIMEOUT) {
        this._debugLog(`[destroy] Guy despawning after ${newTime.toFixed(2)}s without player`);
        this.destroyCharacter(guy);
      }
    }

    // 3. Ball 8 Logic: Destroy Player nếu 3+ Ball 8s chạm vào Player's trigger zone
    const ball8s = this.syncList.filter(e => e.name === 'Ball 8' && !this.destroyedCharacters.has(e));
    
    for (const player of players) {
      if (this.destroyedCharacters.has(player)) continue;

      let playerPos = player.mesh.position;
      let playerRadius = 0.5;

      const playerSmallTrigger = player.mesh?.children?.find(c => c.name === 'TriggerZone_Small');
      if (playerSmallTrigger) {
        const pPos = this._tmpPlayerPos;
        playerSmallTrigger.getWorldPosition(pPos);
        playerPos = pPos;
        playerRadius = playerSmallTrigger.geometry?.parameters?.radius || 1.5;
      }

      // Count all Ball 8s touching Player's trigger zone
      let ball8sInTrigger = 0;
      for (const ball8 of ball8s) {
        const ball8SmallTrigger = ball8.mesh?.children?.find(c => c.name === 'TriggerZone_Small');
        if (!ball8SmallTrigger) continue;

        const ball8Pos = this._tmpBall8Pos;
        ball8SmallTrigger.getWorldPosition(ball8Pos);
        const ball8Radius = ball8SmallTrigger.geometry?.parameters?.radius || 0.5;

        const dist = playerPos.distanceTo(ball8Pos);
        if (dist < (ball8Radius + playerRadius)) {
          ball8sInTrigger++;
        }
      }

      // Destroy player if 3+ Ball 8s are touching the trigger zone
      if (ball8sInTrigger >= 3) {
        this._debugLog(`[destroy] Ball 8s attacking! ${ball8sInTrigger} Ball 8s in player trigger - destroying player`);
        this.destroyCharacter(player);
      }
    }

    // 4. Compune Auto-Despawn: Check CompuneAI shouldDespawn flag
    // CompuneAI handles its own timeout logic (finished or disconnecting)
    // DestroySystem just removes the object when CompuneAI says it's time
    for (const compune of compunes) {
      const compuneAI = compune.body?.userData?.compuneAI;
      if (!compuneAI) continue;

      // Check if CompuneAI has set shouldDespawn flag
      if (compuneAI.shouldDespawn) {
        this._debugLog(`[destroy] Compune shouldDespawn flag set (state: ${compuneAI.state}) - despawning`);
        this.destroyCharacter(compune);
      }
    }
  }

  /**
   * Destroy một character - spawn smoke effect và remove khỏi scene
   */
  destroyCharacter(character) {
    if (!character || this.destroyedCharacters.has(character)) return;

    const characterName = character.name;
    this.destroyedCharacters.add(character);
    
    // Remove from player fall tracking if it's a player
    if (characterName === 'Player') {
      this.playerFallTracking.delete(character);
    }
    
    // Clean up all AI controller references if present on this system
    if (this.guyAIControllers && this.guyAIControllers.has(character)) {
      this.guyAIControllers.delete(character);
    }
    if (this.dudeAIControllers && this.dudeAIControllers.has(character)) {
      this.dudeAIControllers.delete(character);
    }
    if (this.guideAIControllers && this.guideAIControllers.has(character)) {
      const guideAI = this.guideAIControllers.get(character);
      if (guideAI && typeof guideAI.dispose === 'function') guideAI.dispose();
      this.guideAIControllers.delete(character);
    }
    if (this.dummyAIControllers && this.dummyAIControllers.has(character)) {
      this.dummyAIControllers.delete(character);
    }
    if (this.ball8AIControllers && this.ball8AIControllers.has(character)) {
      this.ball8AIControllers.delete(character);
    }
    if (this.bowlingAIControllers && this.bowlingAIControllers.has(character)) {
      const bowlingAI = this.bowlingAIControllers.get(character);
      if (bowlingAI && typeof bowlingAI.dispose === 'function') bowlingAI.dispose();
      this.bowlingAIControllers.delete(character);
    }
    if (this.compuneAIControllers && this.compuneAIControllers.has(character)) {
      const compuneAI = this.compuneAIControllers.get(character);
      if (compuneAI && typeof compuneAI.cleanup === 'function') compuneAI.cleanup();
      this.compuneAIControllers.delete(character);
    }

    // Cleanup CompuneAI if it exists
    if (characterName === 'Compune') {
      const compuneAI = character.body?.userData?.compuneAI;
      if (compuneAI && typeof compuneAI.cleanup === 'function') {
        compuneAI.cleanup();
      }
      this.compuneTimers.delete(character);
    }

    // Spawn smoke effect tại vị trí nhân vật
    if (this.particleManager && character.mesh && !character._destroyFxSpawned) {
      const spawnPos = character.mesh.position.clone();
      this.particleManager.spawn('smoke', spawnPos, { color: 0x999999 });
      character._destroyFxSpawned = true;
    }

    // Queue destroy to spread expensive cleanup over frames.
    this._queueDestroy(character);
    

  }

  /**
   * Reset destroy state (khi spawn scene mới)
   */
  resetCharacterDestroyState() {
    this.destroyedCharacters.clear();
    this.playerFallTracking.clear();
    this.playerFallState.clear();
    this.playerFallSpawnCooldownUntil.clear();
    this.guyTimers.clear();
    this.compuneTimers.clear();
    this.destroyQueue.length = 0;
    this.destroyQueueSet.clear();
  }
}
