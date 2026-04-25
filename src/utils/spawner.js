import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { TABLE_WIDTH, TABLE_DEPTH } from "../assets/objects/BilliardTable.js"
import { CollisionManager } from './collisionManager.js'
import { COLLISION_GROUPS } from '../physics/physicsHelper.js'

// --- Simple Object Pool ---
// Key: prefab.name, Value: Array of pooled entries
const _objectPools = new Map();

export function getObjectPool(prefabName) {
  if (!_objectPools.has(prefabName)) _objectPools.set(prefabName, []);
  return _objectPools.get(prefabName);
}

export function clearAllObjectPools() {
  _objectPools.clear();
}

function inferSpawnCategory(prefab, body) {
  if (prefab?.spawnCategory === 'item' || prefab?.spawnCategory === 'gameObject') {
    return prefab.spawnCategory
  }

  const bodyCategory = body?.userData?.spawnCategory
  if (bodyCategory === 'item' || bodyCategory === 'gameObject') {
    return bodyCategory
  }

  if (body?.collisionFilterGroup === COLLISION_GROUPS.ITEM) {
    return 'item'
  }

  return 'gameObject'
}


// returns a position vector randomly within a slightly smaller area than the table surface
// `baseY` can be used to offset the spawn height (e.g. table top + some clearance)
export function randomPositionAboveTable(height = 5, baseY = 0) {
  // we shrink the available region so objects never spawn exactly on an edge
  const shrinkFactor = 0.9 // 90% of the table dimensions
  const halfW = (TABLE_WIDTH / 2) * shrinkFactor
  const halfD = (TABLE_DEPTH / 2) * shrinkFactor
  const x = (Math.random() * 2 - 1) * halfW
  const z = (Math.random() * 2 - 1) * halfD
  return new THREE.Vector3(x, baseY + height, z)
}

// simplified spawn logic: create mesh/body and integrate with world and hitbox manager
export function spawnObject({
  scene,
  prefab,
  position,
  world,
  physicsMaterials,
  syncList,
  particleManager,
  fakeShadowManager = null, // optional, for fake shadow
  destroySystem = null // optional, for despawn
}) {
  // --- Only allow one instance for certain types ---
  const uniqueTypes = ['Bowling Ball', 'Guy', 'Dude', 'Player'];
  if (uniqueTypes.includes(prefab.name) && Array.isArray(syncList)) {
    for (let i = syncList.length - 1; i >= 0; i--) {
      const entry = syncList[i];
      if (entry && entry.name === prefab.name) {
        // Despawn old instance
        if (destroySystem && typeof destroySystem.destroyObject === 'function') {
          destroySystem.destroyObject(entry);
        } else if (typeof returnObjectToPool === 'function') {
          returnObjectToPool(entry, scene, world, fakeShadowManager);
        }
        // Remove from syncList
        syncList.splice(i, 1);
      }
    }
  }
  // Try to reuse from pool
  const pool = getObjectPool(prefab.name);

  let entry = null;
  if (pool.length > 0) {
    entry = pool.pop();
    // Reactivate mesh
    if (entry.mesh) {
      // Đảm bảo không còn shadow ghost: luôn remove trước khi add lại
      if (fakeShadowManager) fakeShadowManager.removeShadow(entry.mesh);
      scene.add(entry.mesh);
      entry.mesh.visible = true;
      entry.mesh.position.copy(position);
      entry.mesh.rotation.set(0, 0, 0);
      entry.mesh.scale.set(1, 1, 1);
      if (fakeShadowManager) fakeShadowManager.addShadow(entry.mesh, entry.mesh.userData.shadowConfig);
    }
    // Reactivate body
    if (entry.body) {
      entry.body.position.copy(position);
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
      entry.body.quaternion.set(0, 0, 0, 1);
      // --- FIX: Reset body state for pooled items ---
      // Only reset for items (like Baby Oil) or all dynamic objects
      if (entry.spawnCategory === 'item' || entry.type === 'dynamic' || entry.name === 'Baby Oil') {
        // CANNON.Body.DYNAMIC = 1
        entry.body.type = 1;
        entry.body.collisionResponse = true;
        // ĐÚNG: dùng COLLISION_MASKS.ITEM để va chạm đúng với tường, bóng, player, cue
        if (typeof COLLISION_MASKS !== 'undefined' && COLLISION_MASKS.ITEM) {
          entry.body.collisionFilterMask = COLLISION_MASKS.ITEM;
        } else {
          entry.body.collisionFilterMask = -1;
        }
        // --- RESET MARKER STATE ---
        entry.body.userData = entry.body.userData || {};
        entry.body.userData.hasBeenCollectedOnce = false;
        entry.body.userData.isCollectedItem = false;
      }
      entry.body.wakeUp?.();
      world.addBody(entry.body);
    }
    entry._pooled = false;
  } else {
    // Create new
    const mesh = prefab.createMesh();
    scene.add(mesh);
    mesh.position.copy(position);
    // Đảm bảo không còn shadow ghost: luôn remove trước khi add lại
    if (fakeShadowManager) fakeShadowManager.removeShadow(mesh);
    if (fakeShadowManager) fakeShadowManager.addShadow(mesh, mesh.userData.shadowConfig);

    const body = prefab.createBody(physicsMaterials);
    if (body) {
      body.position.copy(position);
      body.name = prefab.name || mesh.name;
      body.userData = body.userData || {};
      body.userData.spawnCategory = inferSpawnCategory(prefab, body);
      world.addBody(body);
    }

    const spawnCategory = inferSpawnCategory(prefab, body);
    mesh.userData = mesh.userData || {};
    mesh.userData.spawnCategory = spawnCategory;

    entry = { mesh, body, type: prefab.type, name: prefab.name, spawnCategory };
  }

  // --- Reset state for unique types ---
  const resetUnique = ['Player', 'Guy', 'Dude', 'Bowling Ball'];
  if (entry && resetUnique.includes(entry.name)) {
    // --- Common resets ---
    entry._destroyFxSpawned = false;
    if (entry.mesh && entry.mesh.userData) {
      entry.mesh.userData._cachedCarriedFlag = false;
    }
    if (entry.body && entry.body.userData) {
      entry.body.userData.isCollectedItem = false;
      entry.body.userData.hasBeenCollectedOnce = false;
    }

    // --- Player specific ---
    if (entry.name === 'Player') {
      entry.hp = 100;
      entry.maxHP = 100;
      entry._isWalking = false;
      entry._lastDamageTime = 0;
      // Reset animation (chân)
      if (entry.mesh) {
        entry.mesh.traverse(child => {
          if (child.userData && child.userData.isLeg) child.rotation.x = 0;
        });
      }
    }
    // --- Guy/Dude specific: reset AI/bot state nếu có ---
    if ((entry.name === 'Guy' || entry.name === 'Dude') && entry.bot) {
      if (typeof entry.bot.resetState === 'function') entry.bot.resetState();
      // Nếu có biến phase, reset về mặc định
      if ('phase' in entry.bot) entry.bot.phase = 0;
    }
    // --- Bowling Ball: reset các biến đặc biệt nếu có ---
    if (entry.name === 'Bowling Ball') {
      // Thêm reset nếu có thuộc tính đặc biệt
    }
  }

  syncList.push(entry);
  CollisionManager.addHitboxForObject(entry);

  // spawn a little smoke when object appears
  if (particleManager && particleManager.spawn) {
    particleManager.spawn('smoke', position.clone());
  }

  return entry;
}
/**
 * Trả object về pool thay vì xóa hoàn toàn
 * Gọi trong destroy logic (destroy.js)
 */
export function returnObjectToPool(entry, scene, world, fakeShadowManager = null) {
  if (!entry) return;
  // Remove from scene/world
  if (entry.mesh) {
    // Luôn remove shadow trước khi remove khỏi scene
    if (fakeShadowManager) fakeShadowManager.removeShadow(entry.mesh);
    entry.mesh.visible = false;
    scene.remove(entry.mesh);
  }
  if (entry.body) {
    world.removeBody(entry.body);
  }
  entry._pooled = true;
  const pool = getObjectPool(entry.name);
  pool.push(entry);
}

export function spawnRandom({
  scene,
  dynamicPrefabs,
  world,
  physicsMaterials,
  syncList,
  particleManager,
  height = 7,
  baseY = 0
}) {
  if (!dynamicPrefabs.length) return
  const prefab = dynamicPrefabs[Math.floor(Math.random() * dynamicPrefabs.length)]
  const pos = randomPositionAboveTable(height, baseY)
  return spawnObject({scene, prefab, position: pos, world, physicsMaterials, syncList, particleManager})
}
