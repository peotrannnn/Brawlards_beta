import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { TABLE_WIDTH, TABLE_DEPTH } from "../assets/objects/BilliardTable.js"
import { CollisionManager } from './collisionManager.js'
import { COLLISION_GROUPS } from '../physics/physicsHelper.js'
import { playSound2 } from '../sounds/sound2.js'

// --- Simple Object Pool ---
const _objectPools = new Map();

export function getObjectPool(prefabName) {
  if (!_objectPools.has(prefabName)) _objectPools.set(prefabName, []);
  return _objectPools.get(prefabName);
}

export function clearAllObjectPools() {
  _objectPools.clear();
}

function inferSpawnCategory(prefab, body) {
  if (prefab?.spawnCategory === 'item' || prefab?.spawnCategory === 'gameObject') return prefab.spawnCategory
  const bodyCategory = body?.userData?.spawnCategory
  if (bodyCategory === 'item' || bodyCategory === 'gameObject') return bodyCategory
  if (body?.collisionFilterGroup === COLLISION_GROUPS.ITEM) return 'item'
  return 'gameObject'
}

export function randomPositionAboveTable(height = 5, baseY = 0) {
  const shrinkFactor = 0.9
  const halfW = (TABLE_WIDTH / 2) * shrinkFactor
  const halfD = (TABLE_DEPTH / 2) * shrinkFactor
  const x = (Math.random() * 2 - 1) * halfW
  const z = (Math.random() * 2 - 1) * halfD
  return new THREE.Vector3(x, baseY + height, z)
}

export function spawnObject({
  scene,
  prefab,
  position,
  world,
  physicsMaterials,
  syncList,
  particleManager,
  fakeShadowManager = null,
  destroySystem = null,
  listenerPosition = null
}) {
  // --- Only allow one instance for certain types ---
  const uniqueTypes = ['Bowling Ball', 'Guy', 'Dude', 'Player'];
  if (uniqueTypes.includes(prefab.name) && Array.isArray(syncList)) {
    for (let i = syncList.length - 1; i >= 0; i--) {
      const entry = syncList[i];
      if (entry && entry.name === prefab.name) {
        if (destroySystem && typeof destroySystem.destroyObject === 'function') {
          destroySystem.destroyObject(entry);
        } else if (typeof returnObjectToPool === 'function') {
          returnObjectToPool(entry, scene, world, fakeShadowManager);
        }
        syncList.splice(i, 1);
      }
    }
  }

  const pool = getObjectPool(prefab.name);
  let entry = null;

  if (pool.length > 0) {
    entry = pool.pop();

    // --- FIX START: CLEANUP POOLED OBJECT ---
    // Xóa sạch các hitbox visuals (dây LineSegments) thừa từ life trước
    // Đây là nguyên nhân chính gây lỗi "hitbox ma" khi spawn lại
    if (entry.mesh) {
      const debugHelpersToRemove = [];
      entry.mesh.traverse(child => {
        // Tìm và xóa các object dùng để vẽ debug hitbox
        if (child.isLineSegments || child.isLineLoop || child.userData?.isDebugHelper) {
          debugHelpersToRemove.push(child);
        }
      });
      debugHelpersToRemove.forEach(helper => {
        entry.mesh.remove(helper);
        if (helper.geometry) helper.geometry.dispose();
        if (helper.material) helper.material.dispose();
      });

      // Xóa shadow cũ nếu có để tránh chồng chất
      if (fakeShadowManager) fakeShadowManager.removeShadow(entry.mesh);
      
      scene.add(entry.mesh);
      entry.mesh.visible = true;
      entry.mesh.position.copy(position);
      entry.mesh.rotation.set(0, 0, 0);
      entry.mesh.scale.set(1, 1, 1);
      entry.mesh.updateMatrixWorld(); // Cập nhật ma trận ngay
      
      if (fakeShadowManager) fakeShadowManager.addShadow(entry.mesh, entry.mesh.userData.shadowConfig);
    }

    // --- FIX START: PHYSICS RESET ---
    // Bắt buộc remove body khỏi world trước khi reset thuộc tính để tránh lỗi physics engine
    if (entry.body) {
      world.removeBody(entry.body); 
      
      entry.body.position.copy(position);
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
      entry.body.quaternion.set(0, 0, 0, 1);
      
      // Reset trạng thái va chạm
      if (entry.spawnCategory === 'item' || entry.type === 'dynamic' || entry.name === 'Baby Oil') {
        entry.body.type = CANNON.Body.DYNAMIC;
        entry.body.collisionResponse = true;
        
        if (typeof COLLISION_MASKS !== 'undefined' && COLLISION_MASKS.ITEM) {
          entry.body.collisionFilterMask = COLLISION_MASKS.ITEM;
        } else {
          entry.body.collisionFilterMask = -1;
        }
      }

      // Reset userData flags cực kỳ quan trọng để tránh logic lỗi
      entry.body.userData = entry.body.userData || {};
      entry.body.userData.hasBeenCollectedOnce = false;
      entry.body.userData.isCollectedItem = false;
      entry.body.userData.physicsEventRegistered = false; // Reset flag đăng ký physics event
      entry.body.userData.floorGuardLastSafePosition = null;
      delete entry.body.userData.floorGuardLastGroundY;
      entry.body.userData.floorGuardArmed = false;
      
      entry.body.wakeUp();
      world.addBody(entry.body);
    }
    // --- FIX END ---

    entry._pooled = false;

  } else {
    // Create new (Logic gốc giữ nguyên)
    const mesh = prefab.createMesh();
    scene.add(mesh);
    mesh.position.copy(position);
    if (fakeShadowManager) fakeShadowManager.addShadow(mesh, mesh.userData.shadowConfig);

    const body = prefab.createBody(physicsMaterials);
    if (body) {
      body.position.copy(position);
      body.name = prefab.name || mesh.name;
      body.userData = body.userData || {};
      body.userData.spawnCategory = inferSpawnCategory(prefab, body);
      body.userData.floorGuardLastSafePosition = null;
      delete body.userData.floorGuardLastGroundY;
      body.userData.floorGuardArmed = false;
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
    entry._destroyFxSpawned = false;
    if (entry.mesh && entry.mesh.userData) {
      entry.mesh.userData._cachedCarriedFlag = false;
    }
    if (entry.body && entry.body.userData) {
      entry.body.userData.isCollectedItem = false;
      entry.body.userData.hasBeenCollectedOnce = false;
    }

    if (entry.name === 'Player') {
      entry.hp = 100;
      entry.maxHP = 100;
      entry._isWalking = false;
      entry._lastDamageTime = 0;
      if (entry.mesh) {
        entry.mesh.traverse(child => {
          if (child.userData && child.userData.isLeg) child.rotation.x = 0;
        });
      }
    }
    if ((entry.name === 'Guy' || entry.name === 'Dude') && entry.bot) {
      if (typeof entry.bot.resetState === 'function') entry.bot.resetState();
      if ('phase' in entry.bot) entry.bot.phase = 0;
    }
  }

  syncList.push(entry);
  CollisionManager.addHitboxForObject(entry);

  if (particleManager && particleManager.spawn) {
    particleManager.spawn('smoke', position.clone());
    playSound2({
      sourcePosition: position,
      listenerPosition,
    })
  }

  return entry;
}

export function returnObjectToPool(entry, scene, world, fakeShadowManager = null) {
  if (!entry) return;
  if (entry.mesh) {
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
  baseY = 0,
  listenerPosition = null
}) {
  if (!dynamicPrefabs.length) return
  const prefab = dynamicPrefabs[Math.floor(Math.random() * dynamicPrefabs.length)]
  const pos = randomPositionAboveTable(height, baseY)
  return spawnObject({scene, prefab, position: pos, world, physicsMaterials, syncList, particleManager, listenerPosition})
}