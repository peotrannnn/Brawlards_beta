import * as THREE from "three"
import { returnObjectToPool } from "./spawner.js"

const DESTROY_SYSTEM_CONFIG = {
  destroyTimeout: 3000,
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
    
    this.destroyedCharacters = new Set();
    this.playerFallTracking = new Set();
    this.playerFallState = new Map();
    this.playerFallSpawnCooldownUntil = new Map();
    
    this.guyTimers = new Map();
    this.GUY_NO_PLAYER_TIMEOUT = 10.0;
    
    this.compuneTimers = new Map();
    this.COMPUNE_DISCONNECT_TIMEOUT = 10.0;

    this.destroyQueue = [];
    this.destroyQueueSet = new Set();

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
    if (this.pending.has(entry)) {
      clearTimeout(this.pending.get(entry));
      this.pending.delete(entry);
    }
    this.destroyQueueSet.delete(entry);

    // --- FIX: Deep Cleanup Mesh Children ---
    // Xóa sạch các helper visual thừa (do CollisionManager tạo ra) trước khi remove mesh
    if (entry.mesh) {
        const toRemove = [];
        entry.mesh.traverse(c => {
            if (c.isLineSegments || c.isLineLoop || c.userData?.isDebugHelper) {
                toRemove.push(c);
            }
        });
        toRemove.forEach(c => {
            if(c.parent) c.parent.remove(c);
            if(c.geometry) c.geometry.dispose();
            if(c.material) c.material.dispose();
        });
        
        if (this.hbManager && this.hbManager.removeHitboxForObject) {
            this.hbManager.removeHitboxForObject(entry);
        }
    }
    // --- END FIX ---

    if (this.hbManager && this.hbManager.removeHitboxForObject) {
      this.hbManager.removeHitboxForObject(entry);
    }
    
    const idx = this.syncList.indexOf(entry);
    if (idx !== -1) this.syncList.splice(idx, 1);
    
    if (this.guyTimers.has(entry)) this.guyTimers.delete(entry);
    if (this.destroyedCharacters.has(entry)) this.destroyedCharacters.delete(entry);
    
    if (entry && entry.name === 'Player') {
      this.playerFallTracking.delete(entry);
      this.playerFallState.delete(entry);
      this.playerFallSpawnCooldownUntil.delete(entry);
    }
    
    if (this.compuneTimers.has(entry)) this.compuneTimers.delete(entry);
    if (this.pending.has(entry)) {
      clearTimeout(this.pending.get(entry));
      this.pending.delete(entry);
    }
    
    if (entry.body?.userData?.ball8AI) {
      const ball8AI = entry.body.userData.ball8AI;
      if (ball8AI.dispose) ball8AI.dispose();
    }
    
    if (entry.body?.userData?.triggerBody) {
      const tb = entry.body.userData.triggerBody;
      this.world.removeBody(tb);
      if (this.hbManager && this.hbManager.removeHitboxForObject) {
        this.hbManager.removeHitboxForObject({ body: tb });
      }
    }

    returnObjectToPool(entry, this.scene, this.world);
    if (this.onDestroyCallback) {
      try { this.onDestroyCallback(entry); } catch (e) { }
    }
  }

  update() {
    const now = performance.now() / 1000;
    let delta = 0;
    if (this.lastUpdateTime !== null) {
      delta = now - this.lastUpdateTime;
    }
    this.lastUpdateTime = now;

    this.checkCharacterDestroyConditions(delta, now);
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
      if (isNaN(this.planeY)) this.planeY = null;
      return;
    }

    // Check balls
    this.syncList.forEach(entry => {
      if (!entry || !entry.body) return;
      const name = entry.name || ''
      if (!name.includes('Ball')) return
      if (name === 'Ball 8') return
      if (entry.mesh?.userData?.isBowlingBall || name === 'Bowling Ball' || name.includes('BowlingBall')) return

      if (entry.body.position.y < this.planeY) {
        this._queueDestroy(entry);
      }
    })

    // Check player fall
    const players = this.syncList.filter(e => e && e.name === 'Player' && !this.destroyedCharacters.has(e));
    players.forEach(player => {
      if (!player || !player.body) return;
      const y = player.body.position.y;
      const enterThreshold = this.planeY - DESTROY_SYSTEM_CONFIG.playerFallEnterOffset;
      const exitThreshold = this.planeY + DESTROY_SYSTEM_CONFIG.playerFallExitOffset;
      const wasBelow = this.playerFallState.get(player) || false;

      if (wasBelow) {
        if (y > exitThreshold) {
          this.playerFallState.set(player, false);
          this.playerFallTracking.delete(player);
        }
        return;
      }

      if (y < enterThreshold && !this.playerFallTracking.has(player)) {
        this.playerFallTracking.add(player);
        this.playerFallState.set(player, true);

        const cooldownUntil = this.playerFallSpawnCooldownUntil.get(player) || 0;
        if (now < cooldownUntil) return;

        this.playerFallSpawnCooldownUntil.set(player, now + DESTROY_SYSTEM_CONFIG.playerFallSpawnCooldownSec);
        if (this.spawnCallback) {
          try { this.spawnCallback(player); } catch (e) {}
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

  setParticleManager(pm) {
    this.particleManager = pm;
  }

  destroyObject(entry) {
    if (!entry) return;
    this._queueDestroy(entry);
  }

    checkCharacterDestroyConditions(delta = 0, now = performance.now() / 1000) {
      // OPTIMIZATION: Filter lists ONCE instead of inside nested loops
      const bowlingBalls = this.syncList.filter(e => (e.name === 'Bowling Ball' || e.mesh?.userData?.isBowlingBall) && !this.destroyedCharacters.has(e));
      const dynamicEntries = this.syncList.filter(e => e.type === 'dynamic' && !this.destroyedCharacters.has(e));

      // --- Bowling Ball Logic (Fixed: Cannon.js Vec3 does not have distanceToSquared) ---
      for (const bowling of bowlingBalls) {
        if (!bowling.body) continue;
        const bowlingPos = bowling.body.position;
        const bowlingRadius = bowling.body.shapes?.[0]?.radius || 0.5;

        for (const entry of dynamicEntries) {
            if (entry === bowling || entry.name === 'Player') continue;
            if (!entry.body || !entry.body.position) continue;
            
            const entryPos = entry.body.position;
            const entryRadius = entry.body.shapes?.[0]?.radius || 0.5;

            // 1. AABB Check (Axis-Aligned Bounding Box) - Lọc nhanh
            const dx = Math.abs(bowlingPos.x - entryPos.x);
            const dy = Math.abs(bowlingPos.y - entryPos.y);
            const dz = Math.abs(bowlingPos.z - entryPos.z);
            const limit = bowlingRadius + entryRadius + 0.1; // Buffer nhỏ
            
            if (dx < limit && dy < limit && dz < limit) {
                // 2. Exact Distance Check (Sử dụng toán học thủ công thay vì .distanceToSquared vì đây là CANNON.Vec3)
                const distSq = dx*dx + dy*dy + dz*dz;
                const limitSq = limit * limit;
                
                if (distSq < limitSq) {
                    this.destroyCharacter(entry);
                }
            }
        }
      }

    const players = this.syncList.filter(e => e.name === 'Player' && !this.destroyedCharacters.has(e));
    const guys = this.syncList.filter(e => e.name === 'Guy' && !this.destroyedCharacters.has(e));
    const compunes = this.syncList.filter(e => e.name === 'Compune' && !this.destroyedCharacters.has(e));

    // 1. Guy Damage Player
    for (const guy of guys) {
      const guySmallTrigger = guy.mesh?.children.find(c => c.name === 'TriggerZone_Small');
      if (!guySmallTrigger) continue;
      const guyPos = this._tmpGuyPos;
      guySmallTrigger.getWorldPosition(guyPos);
      const guyRadius = guySmallTrigger.geometry?.parameters?.radius || 1.5;

      for (const player of players) {
        if (this.destroyedCharacters.has(player)) continue;
        let playerPos = player.mesh.position;
        let playerRadius = 0.5;
        const playerSmallTrigger = player.mesh?.children.find(c => c.name === 'TriggerZone_Small');
        if (playerSmallTrigger) {
          const pPos = this._tmpPlayerPos;
          playerSmallTrigger.getWorldPosition(pPos);
          playerPos = pPos;
          playerRadius = playerSmallTrigger.geometry?.parameters?.radius || 1.5;
        }

        const dist = playerPos.distanceTo(guyPos);
        if (dist < (guyRadius + playerRadius)) {
          if (typeof player.hp !== 'number' || isNaN(player.hp)) player.hp = 100;
          if (typeof player.maxHP !== 'number' || isNaN(player.maxHP)) player.maxHP = 100;
          player.hp -= 1 * delta * 60;
          player._lastDamageTime = performance.now();
          if (typeof window !== 'undefined' && window.uiManager) window.uiManager.updateHPBar(player.hp, player.maxHP);
          if (player.hp <= 0) {
            player.hp = 0;
            if (typeof window !== 'undefined' && window.uiManager) window.uiManager.updateHPBar(player.hp, player.maxHP);
            this.destroyCharacter(player);
          }
        }
      }
    }

    // 2. Guy Auto-Despawn
    for (const guy of guys) {
      const guyLargeTrigger = guy.mesh?.children.find(c => c.name === 'TriggerZone_Large');
      if (!guyLargeTrigger) continue;
      const guyPos = this._tmpGuyPos;
      guyLargeTrigger.getWorldPosition(guyPos);
      const guyLargeRadius = guyLargeTrigger.geometry?.parameters?.radius || 40;

      let playerInRange = false;
      for (const player of players) {
        if (this.destroyedCharacters.has(player)) continue;
        const dist = player.mesh.position.distanceTo(guyPos);
        if (dist < guyLargeRadius) {
          playerInRange = true;
          break;
        }
      }

      if (!this.guyTimers.has(guy)) this.guyTimers.set(guy, 0);
      let newTime = this.guyTimers.get(guy);
      newTime = playerInRange ? 0 : newTime + delta;
      this.guyTimers.set(guy, newTime);

      if (newTime >= this.GUY_NO_PLAYER_TIMEOUT) this.destroyCharacter(guy);
    }

    // 3. Ball 8 Logic
    const ball8s = this.syncList.filter(e => e.name === 'Ball 8' && !this.destroyedCharacters.has(e));
    for (const player of players) {
      if (this.destroyedCharacters.has(player)) continue;
      let playerPos = player.mesh.position;
      let playerRadius = 0.5;
      const playerSmallTrigger = player.mesh?.children.find(c => c.name === 'TriggerZone_Small');
      if (playerSmallTrigger) {
        const pPos = this._tmpPlayerPos;
        playerSmallTrigger.getWorldPosition(pPos);
        playerPos = pPos;
        playerRadius = playerSmallTrigger.geometry?.parameters?.radius || 1.5;
      }

      let ball8sInTrigger = 0;
      for (const ball8 of ball8s) {
        const ball8SmallTrigger = ball8.mesh?.children?.find(c => c.name === 'TriggerZone_Small');
        if (!ball8SmallTrigger) continue;
        const ball8Pos = this._tmpBall8Pos;
        ball8SmallTrigger.getWorldPosition(ball8Pos);
        const ball8Radius = ball8SmallTrigger.geometry?.parameters?.radius || 0.5;
        if (playerPos.distanceTo(ball8Pos) < (ball8Radius + playerRadius)) ball8sInTrigger++;
      }

      if (ball8sInTrigger >= 3) {
        player.hp -= 1 * delta * 60;
        player._lastDamageTime = performance.now();
        if (typeof window !== 'undefined' && window.uiManager) window.uiManager.updateHPBar(player.hp, player.maxHP);
        if (player.hp <= 0) {
          player.hp = 0;
          if (typeof window !== 'undefined' && window.uiManager) window.uiManager.updateHPBar(player.hp, player.maxHP);
          this.destroyCharacter(player);
        }
      }
    }

    // 4. Bowling Ball Damage Player
    for (const player of players) {
      if (this.destroyedCharacters.has(player)) continue;
      let playerPos = player.mesh.position;
      let playerRadius = 0.5;
      const playerSmallTrigger = player.mesh?.children.find(c => c.name === 'TriggerZone_Small');
      if (playerSmallTrigger) {
        const pPos = this._tmpPlayerPos;
        playerSmallTrigger.getWorldPosition(pPos);
        playerPos = pPos;
        playerRadius = playerSmallTrigger.geometry?.parameters?.radius || 1.5;
      }

      for (const bowling of bowlingBalls) {
        let bowlingPos = bowling.mesh?.position;
        let bowlingRadius = 0.5;
        const bowlingSmallTrigger = bowling.mesh?.children?.find(c => c.name === 'TriggerZone_Small');
        if (bowlingSmallTrigger) {
          const bPos = this._tmpBall8Pos;
          bowlingSmallTrigger.getWorldPosition(bPos);
          bowlingPos = bPos;
          bowlingRadius = bowlingSmallTrigger.geometry?.parameters?.radius || 1.5;
        }
        if (!bowlingPos) continue;
        const dist = playerPos.distanceTo(bowlingPos);
        if (dist < (bowlingRadius + playerRadius)) {
          if (typeof player.hp !== 'number' || isNaN(player.hp)) player.hp = 100;
          if (typeof player.maxHP !== 'number' || isNaN(player.maxHP)) player.maxHP = 100;
          player.hp -= 1 * delta * 60;
          player._lastDamageTime = performance.now();
          if (typeof window !== 'undefined' && window.uiManager) window.uiManager.updateHPBar(player.hp, player.maxHP);
          if (player.hp <= 0) {
            player.hp = 0;
            if (typeof window !== 'undefined' && window.uiManager) window.uiManager.updateHPBar(player.hp, player.maxHP);
            this.destroyCharacter(player);
          }
        }
      }
    }

    // 5. Compune Auto-Despawn
    for (const compune of compunes) {
      const compuneAI = compune.body?.userData?.compuneAI;
      if (!compuneAI) continue;
      if (compuneAI.shouldDespawn) this.destroyCharacter(compune);
    }
  }

  destroyCharacter(character) {
    if (!character || this.destroyedCharacters.has(character)) return;
    this.destroyedCharacters.add(character);
    
    if (character.name === 'Player') {
      this.playerFallTracking.delete(character);
      character.hp = 0;
    }
    
    if (this.guyAIControllers && this.guyAIControllers.has(character)) this.guyAIControllers.delete(character);
    if (this.dudeAIControllers && this.dudeAIControllers.has(character)) this.dudeAIControllers.delete(character);
    if (this.guideAIControllers && this.guideAIControllers.has(character)) {
      const guideAI = this.guideAIControllers.get(character);
      if (guideAI && typeof guideAI.dispose === 'function') guideAI.dispose();
      this.guideAIControllers.delete(character);
    }
    if (this.dummyAIControllers && this.dummyAIControllers.has(character)) this.dummyAIControllers.delete(character);
    if (this.ball8AIControllers && this.ball8AIControllers.has(character)) this.ball8AIControllers.delete(character);
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

    if (character.name === 'Compune') {
      const compuneAI = character.body?.userData?.compuneAI;
      if (compuneAI && typeof compuneAI.cleanup === 'function') compuneAI.cleanup();
      this.compuneTimers.delete(character);
    }

    if (this.particleManager && character.mesh && !character._destroyFxSpawned) {
      const spawnPos = character.mesh.position.clone();
      this.particleManager.spawn('smoke', spawnPos, { color: 0x999999 });
      character._destroyFxSpawned = true;
    }

    this._queueDestroy(character);
  }

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